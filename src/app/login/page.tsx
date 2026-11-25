import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { LoginForm } from '@/components/login-form';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <section className="relative hidden flex-col justify-between bg-navy p-10 text-white lg:flex lg:p-[clamp(32px,7vw,100px)]">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-white text-[15px] font-extrabold tracking-tight text-navy">
            PR
          </span>
          <div>
            <p className="font-display text-[19px] font-extrabold leading-tight tracking-[-0.5px]">PetaRisiko</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[2px] text-white/65">Risk intelligence</p>
          </div>
        </div>

        <div className="max-w-[520px]">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-teal-light">Risk management workspace</p>
          <h1 className="mt-4 font-display text-[clamp(34px,4.5vw,54px)] font-extrabold leading-[1.12] tracking-[-1.7px]">
            Pahami risiko.
            <br />
            Ambil keputusan
            <br />
            dengan lebih jelas.
          </h1>
          <p className="mt-5 max-w-[420px] text-sm leading-[1.8] text-white/80">
            Satu ruang kerja untuk mencatat, menilai, memantau, dan meninjau risiko organisasi.
          </p>
          <ul className="mt-8 grid max-w-[420px] gap-3 text-[13px] text-white/75">
            {[
              'Skor inherent & residual dihitung server',
              'Alur persetujuan Draft → Diajukan → Aktif → Retired',
              'Heat map 5×5, Risk Appetite, dan audit log',
              'Impor Excel dengan validasi per baris',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-light" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-white/50">© 2026 PetaRisiko · Workspace organisasi</p>
      </section>

      <section className="flex items-center justify-center bg-canvas px-5 py-12 sm:px-8">
        <div className="w-full max-w-[390px] rounded-[14px] border border-line bg-white p-6 shadow-[var(--shadow-raised)] sm:p-9">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-navy text-[13px] font-extrabold text-white">
              PR
            </span>
            <span className="font-display text-[15px] font-extrabold tracking-tight text-navy">PetaRisiko</span>
          </div>

          <div className="grid h-[42px] w-[42px] place-items-center rounded-[10px] bg-teal-soft text-teal">
            <ShieldCheck size={20} />
          </div>
          <h2 className="mt-5 font-display text-2xl font-extrabold tracking-[-0.6px] text-navy">Masuk ke PetaRisiko</h2>
          <p className="mb-6 mt-1.5 text-xs text-muted">Gunakan akun organisasi yang telah terdaftar.</p>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
