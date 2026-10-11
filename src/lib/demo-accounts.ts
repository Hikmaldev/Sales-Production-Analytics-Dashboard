// Demo accounts created by `npm run db:seed`, surfaced as quick-fill buttons
// on the login page so reviewers can explore both roles instantly.
export interface DemoAccount {
  label: string;
  email: string;
  password: string;
  hint: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Admin",
    email: "admin@example.com",
    password: "admin12345",
    hint: "Full access, including the Admin pages",
  },
  {
    label: "Viewer",
    email: "viewer@example.com",
    password: "viewer12345",
    hint: "Dashboard and exports only",
  },
];
