import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10 mt-auto relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="mb-6 flex justify-center">
          <Image 
            src="/lelang/logo.png" 
            alt="MBG Logo" 
            width={240} 
            height={100} 
            className="w-auto h-20 sm:h-24 object-contain"
          />
        </div>
        <p className="mb-2 font-semibold text-slate-800">PT Makmur Bersama Gadai</p>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">Platform O2O (Online-to-Offline) Katalog MBG. Telusuri online, transaksikan dengan aman di cabang kami.</p>
        
        <div className="pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-4">
          <span>&copy; {new Date().getFullYear()} PT MBG. Hak cipta dilindungi.</span>
          <span className="hidden sm:block">•</span>
          <a href="#" className="hover:text-slate-700 transition-colors">Syarat & Ketentuan</a>
          <span className="hidden sm:block">•</span>
          <a href="#" className="hover:text-slate-700 transition-colors">Kebijakan Privasi</a>
        </div>
      </div>
    </footer>
  );
}
