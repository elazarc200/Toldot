import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const forbidden = params.error === "forbidden";
  const nextPath = params.next === "/admin" ? "/admin" : "/admin";

  return (
    <main className="shell">
      <h1 className="brand" style={{ fontSize: "2rem" }}>
        התחברות
      </h1>
      <p className="lede">
        התחברות לעורכים מאושרים בלבד. האזור הציבורי אינו דורש חשבון.
      </p>

      {forbidden ? (
        <div className="alert alert-error" role="alert">
          המשתמש מחובר אך אינו חבר מערכת העריכה. בקשו מהמנהל להריץ את סקריפט
          ה־bootstrap או להעניק תפקיד עריכה.
        </div>
      ) : null}

      <section className="panel">
        <h2>כניסה עם דוא״ל וסיסמה</h2>
        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
