const productionProjectRef = "mwxpkheuhmifjbleocwk";
const requestedProjectRef = (
  process.argv[2] ?? process.env.SUPABASE_PROJECT_REF ?? ""
).trim();

if (!requestedProjectRef) {
  console.error(
    "Missing project ref. Usage: npm run supabase:check-target -- YOUR_STAGING_PROJECT_REF",
  );
  process.exit(1);
}

if (!/^[a-z0-9]{20}$/.test(requestedProjectRef)) {
  console.error("Invalid Supabase project ref format.");
  process.exit(1);
}

if (requestedProjectRef === productionProjectRef) {
  console.error(
    "Refusing target: this is the Supabase project used by the public VimmoAI deployment.",
  );
  process.exit(2);
}

console.log(
  `Target ${requestedProjectRef} differs from the known production project. Confirm in the Supabase Dashboard that it is staging before linking.`,
);
