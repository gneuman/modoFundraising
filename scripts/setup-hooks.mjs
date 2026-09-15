#!/usr/bin/env node
// Activa los git hooks locales apuntando core.hooksPath a .githooks/
// y asegura que sean ejecutables.
//
// Uso: npm run setup:hooks

import { execSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const HOOKS_DIR = ".githooks";

function run(cmd) {
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
}

try {
  run("git rev-parse --is-inside-work-tree");
} catch {
  console.error("Error: no estas dentro de un repo git.");
  process.exit(1);
}

if (!existsSync(HOOKS_DIR)) {
  console.error(`Error: no existe el directorio ${HOOKS_DIR}/`);
  process.exit(1);
}

// Rescatar hooks que ya vivian en .git/hooks/.
// Apuntar core.hooksPath a .githooks/ los DESACTIVA en silencio: git deja
// de mirar .git/hooks/ por completo. Un pre-commit que corre el typecheck
// dejaria de correr sin que nadie lo note. Copiarlos antes es lo que evita
// cambiar un candado por otro.
const gitDir = run("git rev-parse --git-dir");
const legacyDir = join(gitDir, "hooks");
if (existsSync(legacyDir)) {
  const vivos = readdirSync(legacyDir).filter(
    (f) => !f.endsWith(".sample") && !f.startsWith("."),
  );
  for (const hook of vivos) {
    const destino = join(HOOKS_DIR, hook);
    if (existsSync(destino)) {
      console.log(`! ${hook} ya existe en ${HOOKS_DIR}/ — conservo el de ${HOOKS_DIR}/`);
      console.log(`  (el viejo sigue en ${legacyDir}, revisalo si tenia logica propia)`);
      continue;
    }
    copyFileSync(join(legacyDir, hook), destino);
    console.log(`✓ ${hook} rescatado de .git/hooks/ → ${HOOKS_DIR}/`);
  }
}

run(`git config core.hooksPath ${HOOKS_DIR}`);
console.log(`✓ core.hooksPath = ${HOOKS_DIR}`);

// Limpiar alias 'git nb' de iteraciones anteriores (si existia)
try {
  run(`git config --unset alias.nb`);
} catch {
  // No existia, ok
}

// Marcar hooks como ejecutables (irrelevante en Windows pero no rompe)
const files = readdirSync(HOOKS_DIR).filter((f) => !f.startsWith("."));
for (const file of files) {
  const full = join(HOOKS_DIR, file);
  try {
    chmodSync(full, 0o755);
  } catch {
    // Windows: chmod no aplica, ignora
  }
  console.log(`✓ ${full} listo`);
}

console.log("");
console.log("Hooks activos. Los pushes ahora validan el nombre del branch.");
console.log("Para desactivar: git config --unset core.hooksPath");
