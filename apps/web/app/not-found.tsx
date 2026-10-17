import Link from "next/link";

export default function NotFound() {
  return (
    <div className="title-screen">
      <div className="title-card">
        <span className="logo">404</span>
        <p className="motto">
          <span>Ce chemin ne mène nulle part.</span>
          <span>This path leads nowhere.</span>
        </p>
        <Link className="btn primary" href="/">
          TextRPG
        </Link>
      </div>
    </div>
  );
}
