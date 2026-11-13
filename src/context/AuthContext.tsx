/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  stripUndefinedDeep
} from '../firebase';
import { EmpresaUserSummary, UserInvite, UserPermisos, UserProfile, UserRole } from '../types';
import {
  BOOTSTRAP_SUPER_ADMIN_EMAIL,
  FULL_PERMISOS,
  makeInviteIdForEmail
} from '../utils/rbac';

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'unauthorized'
  | 'inactive'
  | 'authorized';

export interface SaveUserAccessInput {
  email: string;
  nombre: string;
  cargo?: string;
  role: UserRole;
  empresaCodigo: string;
  empresaNombre: string;
  permisos: UserPermisos;
  activo: boolean;
  existingInviteId?: string;
  existingUid?: string;
}

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  authStatus: AuthStatus;
  authError: string | null;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  saveUserAccess: (input: SaveUserAccessInput) => Promise<void>;
  deleteUserAccess: (target: EmpresaUserSummary) => Promise<void>;
  loadCompanyUsersRoster: (empresaCodigo: string) => Promise<EmpresaUserSummary[]>;
  loadAllUsersForSuperAdmin: (empresaCodigos: string[]) => Promise<EmpresaUserSummary[]>;
  syncEmpresaNombreEnRoster: (empresaCodigo: string, nuevoNombre: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const isSuperAdmin = Boolean(
    userProfile && userProfile.activo && userProfile.role === 'super_admin'
  );
  const isCompanyAdmin = Boolean(
    userProfile &&
      userProfile.activo &&
      (userProfile.role === 'super_admin' || userProfile.role === 'company_admin')
  );

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let isCancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setFirebaseUser(fbUser);
      setAuthError(null);

      if (!fbUser) {
        setUserProfile(null);
        setAuthStatus('unauthenticated');
        return;
      }

      setAuthStatus('loading');
      const email = (fbUser.email || '').trim().toLowerCase();
      const adminPath = `admins/${fbUser.uid}`;
      const userPath = `users/${fbUser.uid}`;

      try {
        // 1. Bootstrapped Super Admin path
        if (email === BOOTSTRAP_SUPER_ADMIN_EMAIL) {
          const adminRef = doc(db, 'admins', fbUser.uid);
          let adminSnap;
          try {
            adminSnap = await getDoc(adminRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, adminPath);
          }
          if (!adminSnap.exists()) {
            try {
              await setDoc(adminRef, {
                uid: fbUser.uid,
                email,
                nombre: fbUser.displayName || 'Administrador General',
                createdAt: serverTimestamp()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, adminPath);
            }
          }

          const userRef = doc(db, 'users', fbUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, userPath);
          }
          if (!userSnap.exists()) {
            try {
              await setDoc(
                userRef,
                stripUndefinedDeep({
                  uid: fbUser.uid,
                  email,
                  nombre: fbUser.displayName || 'Administrador General',
                  cargo: 'Administrador General CMMS',
                  role: 'super_admin',
                  empresaCodigo: '',
                  empresaNombre: 'Todas las Empresas',
                  permisos: FULL_PERMISOS,
                  activo: true,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                })
              );
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, userPath);
            }
          } else {
            const existingProfile = userSnap.data() as Partial<UserProfile>;
            if (!existingProfile.activo || existingProfile.role !== 'super_admin') {
              try {
                await updateDoc(userRef, {
                  role: 'super_admin',
                  activo: true,
                  permisos: FULL_PERMISOS,
                  updatedAt: serverTimestamp()
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, userPath);
              }
            }
          }

          if (isCancelled) return;
          unsubscribeProfile = onSnapshot(
            userRef,
            (snap) => {
              if (!snap.exists()) return;
              const data = snap.data() as UserProfile;
              setUserProfile(data);
              setAuthStatus(data.activo ? 'authorized' : 'inactive');
            },
            (err) => {
              setAuthError('Error de conexión al perfil de administrador.');
              handleFirestoreError(err, OperationType.GET, userPath);
            }
          );
          return;
        }

        // 2. Standard User / Company Admin lookup
        const userRef = doc(db, 'users', fbUser.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userPath);
        }

        if (userSnap.exists()) {
          if (isCancelled) return;
          unsubscribeProfile = onSnapshot(
            userRef,
            (snap) => {
              if (!snap.exists()) {
                setUserProfile(null);
                setAuthStatus('unauthorized');
                return;
              }
              const data = snap.data() as UserProfile;
              setUserProfile(data);
              setAuthStatus(data.activo ? 'authorized' : 'inactive');
            },
            (err) => {
              setAuthError('Error al sincronizar permisos de usuario.');
              handleFirestoreError(err, OperationType.GET, userPath);
            }
          );
          return;
        }

        // 3. First login: check if email has an active invitation in user_invites
        const invitesQuery = query(
          collection(db, 'user_invites'),
          where('email', '==', email)
        );
        let invitesSnap;
        try {
          invitesSnap = await getDocs(invitesQuery);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'user_invites');
        }
        if (isCancelled) return;

        if (invitesSnap.empty) {
          setUserProfile(null);
          setAuthStatus('unauthorized');
          return;
        }

        const inviteDocs = invitesSnap.docs.map((d) => ({
          ...(d.data() as UserInvite),
          id: d.id
        }));
        const activeInvite = inviteDocs.find((inv) => inv.activo);

        if (!activeInvite) {
          setUserProfile(null);
          setAuthStatus('inactive');
          return;
        }

        // Claim the invitation atomically into /users/{uid}
        const newProfilePayload = stripUndefinedDeep({
          uid: fbUser.uid,
          email: activeInvite.email,
          nombre: activeInvite.nombre || fbUser.displayName || email,
          cargo: activeInvite.cargo || '',
          role: activeInvite.role,
          empresaCodigo: activeInvite.empresaCodigo || '',
          empresaNombre: activeInvite.empresaNombre || '',
          permisos: activeInvite.permisos,
          activo: true,
          inviteId: activeInvite.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        try {
          await setDoc(userRef, newProfilePayload);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, userPath);
        }

        // Record claimedUid back on the invite (allowed by rules)
        try {
          await updateDoc(doc(db, 'user_invites', activeInvite.id), {
            claimedUid: fbUser.uid,
            updatedAt: serverTimestamp()
          });
        } catch (claimUpdateErr) {
          console.warn('No se pudo actualizar claimedUid en invite:', claimUpdateErr);
        }

        if (isCancelled) return;
        unsubscribeProfile = onSnapshot(
          userRef,
          (snap) => {
            if (!snap.exists()) {
              setUserProfile(null);
              setAuthStatus('unauthorized');
              return;
            }
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            setAuthStatus(data.activo ? 'authorized' : 'inactive');
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, userPath);
          }
        );
      } catch (err) {
        console.error('Auth resolution error:', err);
        let displayMsg = 'Error al validar acceso en Firebase.';
        if (err instanceof Error) {
          try {
            const parsed = JSON.parse(err.message) as {
              error?: string;
              operationType?: string;
              path?: string;
            };
            displayMsg = parsed.error
              ? `${parsed.error}${parsed.path ? ` (${parsed.operationType} ${parsed.path})` : ''}`
              : err.message;
          } catch {
            displayMsg = err.message;
          }
        }
        setAuthError(displayMsg);
        setAuthStatus('unauthorized');
      }
    });

    return () => {
      isCancelled = true;
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, [refreshCounter]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No se pudo completar el inicio de sesión.';
      setAuthError(msg);
      throw err;
    }
  };

  const signOut = async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
    setUserProfile(null);
    setAuthStatus('unauthenticated');
  };

  const refreshAccess = async () => {
    setRefreshCounter((c) => c + 1);
  };

  const upsertRosterMember = async (
    empresaCodigo: string,
    member: EmpresaUserSummary,
    remove = false
  ) => {
    if (!empresaCodigo || !auth.currentUser) return;
    const rosterPath = `empresas/${empresaCodigo}/config/usuarios`;
    const rosterRef = doc(db, 'empresas', empresaCodigo, 'config', 'usuarios');
    try {
      const snap = await getDoc(rosterRef);
      const currentMiembros: EmpresaUserSummary[] = snap.exists()
        ? ((snap.data().miembros as EmpresaUserSummary[]) || [])
        : [];
      const filtered = currentMiembros.filter(
        (m) =>
          m.id !== member.id &&
          m.email.toLowerCase() !== member.email.toLowerCase()
      );
      const nextMiembros = remove ? filtered : [...filtered, member];
      if (!snap.exists()) {
        await setDoc(
          rosterRef,
          stripUndefinedDeep({
            empresaCodigo,
            miembros: nextMiembros,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid
          })
        );
      } else {
        await updateDoc(
          rosterRef,
          stripUndefinedDeep({
            miembros: nextMiembros,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid
          })
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, rosterPath);
    }
  };

  const saveUserAccess = useCallback(
    async (input: SaveUserAccessInput) => {
      if (!auth.currentUser || !userProfile) {
        throw new Error('Sesión no autenticada.');
      }

      const normalizedEmail = input.email.trim().toLowerCase();
      const inviteId = input.existingInviteId || makeInviteIdForEmail(normalizedEmail);
      const inviteRef = doc(db, 'user_invites', inviteId);
      const invitePath = `user_invites/${inviteId}`;

      const finalRole: UserRole = isSuperAdmin
        ? input.role
        : input.role === 'super_admin'
        ? 'company_admin'
        : input.role;
      const finalEmpresaCodigo =
        finalRole === 'super_admin'
          ? ''
          : isSuperAdmin
          ? input.empresaCodigo
          : userProfile.empresaCodigo;
      const finalEmpresaNombre =
        finalRole === 'super_admin'
          ? 'Todas las Empresas'
          : isSuperAdmin
          ? input.empresaNombre
          : userProfile.empresaNombre;

      let claimedUid = input.existingUid;

      try {
        const invSnap = await getDoc(inviteRef);
        if (invSnap.exists()) {
          const existingInv = invSnap.data() as UserInvite;
          if (!claimedUid && existingInv.claimedUid) {
            claimedUid = existingInv.claimedUid;
          }
          await updateDoc(
            inviteRef,
            stripUndefinedDeep({
              nombre: input.nombre.trim(),
              cargo: (input.cargo || '').trim(),
              role: finalRole,
              empresaCodigo: finalEmpresaCodigo,
              empresaNombre: finalEmpresaNombre,
              permisos: input.permisos,
              activo: input.activo,
              updatedAt: serverTimestamp()
            })
          );
        } else {
          await setDoc(
            inviteRef,
            stripUndefinedDeep({
              id: inviteId,
              email: normalizedEmail,
              nombre: input.nombre.trim(),
              cargo: (input.cargo || '').trim(),
              role: finalRole,
              empresaCodigo: finalEmpresaCodigo,
              empresaNombre: finalEmpresaNombre,
              permisos: input.permisos,
              activo: input.activo,
              createdByUid: auth.currentUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
          );
        }

        // If user has already signed in, update /users/{uid} live too
        if (claimedUid) {
          const uRef = doc(db, 'users', claimedUid);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            await updateDoc(
              uRef,
              stripUndefinedDeep({
                nombre: input.nombre.trim(),
                cargo: (input.cargo || '').trim(),
                role: finalRole,
                empresaCodigo: finalEmpresaCodigo,
                empresaNombre: finalEmpresaNombre,
                permisos: input.permisos,
                activo: input.activo,
                updatedAt: serverTimestamp()
              })
            );
          }
        }

        // Update company roster if company-scoped
        if (finalEmpresaCodigo) {
          await upsertRosterMember(finalEmpresaCodigo, {
            id: inviteId,
            inviteId,
            uid: claimedUid,
            email: normalizedEmail,
            nombre: input.nombre.trim(),
            cargo: (input.cargo || '').trim(),
            role: finalRole,
            empresaCodigo: finalEmpresaCodigo,
            empresaNombre: finalEmpresaNombre,
            permisos: input.permisos,
            activo: input.activo
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, invitePath);
      }
    },
    [isSuperAdmin, userProfile]
  );

  const deleteUserAccess = useCallback(
    async (target: EmpresaUserSummary) => {
      if (!auth.currentUser) throw new Error('Sesión no autenticada.');

      const inviteId = target.inviteId || target.id || makeInviteIdForEmail(target.email);
      try {
        let uidToDelete = target.uid;
        if (inviteId) {
          const invRef = doc(db, 'user_invites', inviteId);
          const invSnap = await getDoc(invRef);
          if (invSnap.exists()) {
            if (!uidToDelete) {
              uidToDelete = (invSnap.data() as UserInvite).claimedUid;
            }
            await deleteDoc(invRef);
          }
        }

        if (uidToDelete && uidToDelete !== auth.currentUser.uid) {
          const uRef = doc(db, 'users', uidToDelete);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            await deleteDoc(uRef);
          }
        }

        if (target.empresaCodigo) {
          await upsertRosterMember(target.empresaCodigo, target, true);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `user_invites/${inviteId}`);
      }
    },
    []
  );

  const loadCompanyUsersRoster = useCallback(
    async (empresaCodigo: string): Promise<EmpresaUserSummary[]> => {
      if (!empresaCodigo) return [];
      const rosterRef = doc(db, 'empresas', empresaCodigo, 'config', 'usuarios');
      try {
        const snap = await getDoc(rosterRef);
        if (!snap.exists()) return [];
        const miembros = (snap.data().miembros as EmpresaUserSummary[]) || [];
        return miembros;
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.GET,
          `empresas/${empresaCodigo}/config/usuarios`
        );
      }
    },
    []
  );

  const loadAllUsersForSuperAdmin = useCallback(
    async (empresaCodigos: string[]): Promise<EmpresaUserSummary[]> => {
      if (!isSuperAdmin) return [];
      const merged = new Map<string, EmpresaUserSummary>();

      // 1. Read every company's roster via allow get (works for ALL super admins)
      for (const cod of empresaCodigos) {
        try {
          const snap = await getDoc(doc(db, 'empresas', cod, 'config', 'usuarios'));
          if (snap.exists()) {
            const list = (snap.data().miembros as EmpresaUserSummary[]) || [];
            for (const m of list) {
              merged.set(m.email.toLowerCase(), m);
            }
          }
        } catch {
          // Skip missing company roster
        }
      }

      // 2. If bootstrap super admin, also merge global user_invites & users collections directly
      if (firebaseUser?.email?.toLowerCase() === BOOTSTRAP_SUPER_ADMIN_EMAIL) {
        try {
          const invSnap = await getDocs(collection(db, 'user_invites'));
          invSnap.forEach((d) => {
            const inv = d.data() as UserInvite;
            merged.set(inv.email.toLowerCase(), {
              id: d.id,
              inviteId: d.id,
              uid: inv.claimedUid,
              email: inv.email,
              nombre: inv.nombre,
              cargo: inv.cargo,
              role: inv.role,
              empresaCodigo: inv.empresaCodigo,
              empresaNombre: inv.empresaNombre,
              permisos: inv.permisos,
              activo: inv.activo
            });
          });

          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.forEach((d) => {
            const u = d.data() as UserProfile;
            const prev = merged.get(u.email.toLowerCase());
            merged.set(u.email.toLowerCase(), {
              id: prev?.id || u.inviteId || d.id,
              inviteId: prev?.inviteId || u.inviteId,
              uid: d.id,
              email: u.email,
              nombre: u.nombre,
              cargo: u.cargo,
              role: u.role,
              empresaCodigo: u.empresaCodigo,
              empresaNombre: u.empresaNombre,
              permisos: u.permisos,
              activo: u.activo
            });
          });
        } catch (err) {
          console.warn('Global user list merge notice:', err);
        }
      }

      return Array.from(merged.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );
    },
    [isSuperAdmin, firebaseUser]
  );

  const syncEmpresaNombreEnRoster = useCallback(
    async (empresaCodigo: string, nuevoNombre: string) => {
      if (!empresaCodigo || !auth.currentUser) return;
      try {
        const rosterRef = doc(db, 'empresas', empresaCodigo, 'config', 'usuarios');
        const snap = await getDoc(rosterRef);
        if (!snap.exists()) return;
        const miembros = (snap.data().miembros as EmpresaUserSummary[]) || [];
        const updated = miembros.map((m) => ({ ...m, empresaNombre: nuevoNombre }));
        await updateDoc(rosterRef, {
          miembros: updated,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser.uid
        });
      } catch {
        // Non-blocking sync
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        authStatus,
        authError,
        isSuperAdmin,
        isCompanyAdmin,
        signInWithGoogle,
        signOut,
        refreshAccess,
        saveUserAccess,
        deleteUserAccess,
        loadCompanyUsersRoster,
        loadAllUsersForSuperAdmin,
        syncEmpresaNombreEnRoster
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
