export class MissingLocalBindingError extends Error {
  constructor(binding) {
    super(
      `Binding local \`${binding}\` indisponível. Rode as migrações e inicie a aplicação com \`npm run dev\`; nenhum recurso remoto é necessário.`,
    );
    this.name = "MissingLocalBindingError";
  }
}

export function requireBinding(environment, binding) {
  const value = environment?.[binding];
  if (!value) throw new MissingLocalBindingError(binding);
  return value;
}
