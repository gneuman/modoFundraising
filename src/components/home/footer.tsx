import Link from "next/link";
import Image from "next/image";
import { NewsletterForm } from "@/components/home/newsletter-form";

const WHATSAPP_URL = "https://wa.me/56912345678?text=Hola%2C%20quiero%20info%20sobre%20Modo%20Fundraising%202026";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="flex flex-col gap-3">
            <a href="https://impacta.vc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
              <Image src="/logo-mf.png" alt="Modo Fundraising" width={60} height={38} className="object-contain" />
              <span className="text-white/50 text-xs">by Impacta VC</span>
            </a>
            <p className="text-white/30 text-xs leading-relaxed">hello@impacta.vc</p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-white/40">
            <span className="text-white/60 font-semibold text-xs uppercase tracking-widest mb-1">Legal</span>
            <Link href="/terminos" className="hover:text-white transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>

          <div>
            <span className="text-white/60 font-semibold text-xs uppercase tracking-widest block mb-3">Newsletter</span>
            <div className="mb-5">
              <NewsletterForm compact />
            </div>
            <div className="flex gap-4 text-white/40 text-sm">
              <a href="https://linkedin.com/company/impactavc" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="https://instagram.com/impactavc" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
              <a href="https://youtube.com/@impactavc" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
              <a href="https://x.com/impactavc" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">X</a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/20">
          <p>© 2026 Impacta VC · hello@impacta.vc</p>
          <p>Built with ❤️ in LatAm</p>
        </div>
      </div>
    </footer>
  );
}

export { WHATSAPP_URL };
