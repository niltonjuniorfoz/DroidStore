import Link from "next/link";
import AuthPanel from "../../src/components/AuthPanel";

export default function LoginPage() {
  return <main className="auth-page">
    <Link href="/" className="auth-page-brand">
      <img src="/android-mascot.png" alt="" />
      <span><strong>Droid</strong><em>Store</em></span>
    </Link>
    <AuthPanel />
  </main>;
}
