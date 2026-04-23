//import type { Metadata } from 'next';
//import { Inter } from 'next/font/google';
//import './globals.css';
//import { AuthProvider } from './context/AuthContext';
//import BottomNav from './components/BottomNav';

//const inter = Inter({ subsets: ['latin'] });

//export const metadata: Metadata = {
 // title: 'EduAI - Apprendre autrement avec l\'IA',
  //description: 'Apprendre plus vite avec l\'aide de l\'IA. Résumés intelligents, quizz adaptatifs et suivi personnalisé.',
  //viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  //themeColor: '#10b981',
//};



//export default function RootLayout({
 // children,
//}: {
 // children: React.ReactNode;
//}) {
//  return (
    //<html lang="fr" suppressHydrationWarning>
     // <body 
     //   className={`${inter.className} bg-gradient-to-br from-slate-50 via-white to-emerald-50 min-h-screen text-slate-900`}
     //   style={{ minHeight: '100dvh' }}
    //  >
      //  <AuthProvider>
       //   {/* Contenu principal avec padding inférieur pour la navigation */}
         // <main className="pb-24 sm:pb-28">
           // {children}
         // </main>
          
         // {/* Navigation inférieure fixe */}
         // <BottomNav />
       // </AuthProvider>
      //</body>
   // </html>
 // );
//}  






import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './context/AuthContext';
import BottomNav from './components/BottomNav';

const inter = Inter({ subsets: ['latin'] });

// 1. Export séparé pour le Viewport (Nouveauté Next.js 15)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#10b981',
};

// 2. Metadata nettoyées
export const metadata: Metadata = {
  title: "EduAI - Apprendre autrement avec l'IA",
  description: "Apprendre plus vite avec l'aide de l'IA. Résumés intelligents, quizz adaptatifs et suivi personnalisé.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body 
        className={`${inter.className} bg-gradient-to-br from-slate-50 via-white to-emerald-50 min-h-screen text-slate-900`}
        style={{ minHeight: '100dvh' }}
      >
        <AuthProvider>
          {/* Contenu principal avec padding inférieur pour la navigation */}
          <main className="pb-24 sm:pb-28">
            {children}
          </main>
          
          {/* Navigation inférieure fixe */}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
