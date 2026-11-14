/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cliente } from '../types';

/**
 * Resolves the active company/client object(s) to display in document/list headers.
 * Works both when a specific company is selected and when "Todos" is active
 * (inferring the company from the rendered rows or active company list).
 */
export function resolveSheetClientes(
  clientes: Cliente[],
  selectedCliente: string,
  rowClienteNames: Array<string | undefined> = []
): Cliente[] {
  const normalizedSelected = (selectedCliente || '').trim().toLowerCase();

  if (
    normalizedSelected &&
    normalizedSelected !== 'todos' &&
    normalizedSelected !== 'todas las plantas'
  ) {
    const exact = clientes.find(
      c => c.nombre.trim().toLowerCase() === normalizedSelected
    );
    if (exact) return [exact];
  }

  const uniqueNames = Array.from(
    new Set(
      rowClienteNames
        .map(n => (n || '').trim())
        .filter(
          n =>
            n.length > 0 &&
            n.toLowerCase() !== 'todas las plantas' &&
            n.toLowerCase() !== 'todos'
        )
    )
  );

  const matched: Cliente[] = [];
  for (const name of uniqueNames) {
    const found = clientes.find(
      c => c.nombre.trim().toLowerCase() === name.toLowerCase()
    );
    if (found && !matched.some(m => m.codigo === found.codigo)) {
      matched.push(found);
    }
  }

  if (matched.length > 0) {
    return matched.slice(0, 3);
  }

  if (clientes.length > 0) {
    return clientes.slice(0, 3);
  }

  return [];
}
