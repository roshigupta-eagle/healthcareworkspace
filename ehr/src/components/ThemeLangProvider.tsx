"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

type Theme = 'light' | 'dark';

// Built-in translations (small set). The provider will also attempt to fetch
// `/locales/{lang}.json` from the public folder to support any BCP-47 code.
const builtInTranslations: Record<string, Record<string, string>> = {
  en: {
    title: 'Healthcare EHR',
    signInTitle: 'Sign in to Healthcare EHR',
    signInButton: 'Sign In',
    signingIn: 'Signing in...',
    dontHaveAccount: "Don't have an account?",
    registerHere: 'Register here',
    createAccountTitle: 'Create an Account',
    registerButton: 'Register',
    creatingAccount: 'Creating account...',
    invalidCredentials: 'Invalid email or password',
    toggleTheme: 'Toggle theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    fullName: 'Full name',
    emailAddress: 'Email address',
    emailHint: 'Enter your registered email address',
    password: 'Password',
    passwordHint: 'Minimum 8 characters',
    confirmPassword: 'Confirm password',
    roleLegend: 'Role',
    patient: 'Patient',
    doctor: 'Doctor / Practitioner',
    admin: 'Administrator',
    newUser: 'New User',
    translate: 'Translate',
    translatedTo: 'Translated to',
    speak: 'Speak',
    captionsOn: 'Captions on',
    captionsOff: 'Captions off',
    doctorView: 'Doctor View',
    completedAppointments: 'Completed Appointments',
    activePatients: 'Active / In-Progress Patients',
    pendingPatients: 'Pending Patients',
    completionRate: 'Completion Rate',
    viewList: 'View list',
    patientsInClinic: 'Patients in clinic',
    patientsToSee: 'Patients to see',
    scheduledToday: 'scheduled today',
  },
  es: {
    title: 'EHR de Salud',
    signInTitle: 'Iniciar sesión en EHR de Salud',
    signInButton: 'Iniciar sesión',
    signingIn: 'Iniciando sesión...',
    dontHaveAccount: '¿No tienes una cuenta?',
    registerHere: 'Regístrate aquí',
    createAccountTitle: 'Crear una cuenta',
    registerButton: 'Registrarse',
    creatingAccount: 'Creando cuenta...',
    invalidCredentials: 'Correo o contraseña inválidos',
    toggleTheme: 'Cambiar tema',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    fullName: 'Nombre completo',
    emailAddress: 'Correo electrónico',
    emailHint: 'Introduce tu correo registrado',
    password: 'Contraseña',
    passwordHint: 'Mínimo 8 caracteres',
    confirmPassword: 'Confirmar contraseña',
    roleLegend: 'Rol',
    patient: 'Paciente',
    doctor: 'Doctor / Profesional',
    admin: 'Administrador',
    newUser: 'Nuevo usuario',
    translate: 'Traducir',
    translatedTo: 'Traducido a',
    speak: 'Leer en voz alta',
    captionsOn: 'Subtítulos activados',
    captionsOff: 'Subtítulos desactivados',
    doctorView: 'Vista del Doctor',
    completedAppointments: 'Citas completadas',
    activePatients: 'Pacientes activos / en curso',
    pendingPatients: 'Pacientes pendientes',
    completionRate: 'Tasa de finalización',
    viewList: 'Ver la lista',
    patientsInClinic: 'Pacientes en la clínica',
    patientsToSee: 'Pacientes por ver',
    scheduledToday: 'programados hoy',
  },
  fr: {
    title: "Dossier Médical Électronique",
    signInTitle: 'Se connecter au DME',
    signInButton: 'Se connecter',
    signingIn: 'Connexion en cours...',
    dontHaveAccount: "Vous n'avez pas de compte ?",
    registerHere: "S'inscrire ici",
    createAccountTitle: 'Créer un compte',
    registerButton: "S'inscrire",
    creatingAccount: 'Création du compte...',
    invalidCredentials: "E-mail ou mot de passe invalide",
    toggleTheme: 'Basculer le thème',
    themeDark: 'Sombre',
    themeLight: 'Clair',
    fullName: 'Nom complet',
    emailAddress: 'Adresse e-mail',
    emailHint: "Entrez votre adresse e-mail enregistrée",
    password: 'Mot de passe',
    passwordHint: 'Au moins 8 caractères',
    confirmPassword: 'Confirmer le mot de passe',
    roleLegend: 'Rôle',
    patient: 'Patient',
    doctor: 'Médecin / Praticien',
    admin: 'Administrateur',
    newUser: 'Nouvel utilisateur',
    translate: 'Traduire',
    translatedTo: 'Traduit en',
    speak: 'Lire',
    captionsOn: 'Sous-titres activés',
    captionsOff: 'Sous-titres désactivés',
    doctorView: 'Vue Médecin',
    completedAppointments: 'Rendez-vous terminés',
    activePatients: 'Patients actifs / en cours',
    pendingPatients: 'Patients en attente',
    completionRate: 'Taux de complétion',
    viewList: 'Voir la liste',
    patientsInClinic: 'Patients sur place',
    patientsToSee: 'Patients à voir',
    scheduledToday: "programmés aujourd'hui",
  },
};

type ContextShape = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  lang: string;
  setLang: (l: string) => void;
  t: (key: string) => string;
  translateAll: () => Promise<void>;
  /** Speak text (or page) using Web Speech API; resolves when finished */
  speak: (text?: string) => Promise<void>;
  /** Last live caption/announcement text */
  liveMessage: string;
  setLiveMessage: (msg: string) => void;
  captionsEnabled: boolean;
  toggleCaptions: () => void;
};

const ThemeLangContext = createContext<ContextShape>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  lang: 'en',
  setLang: () => {},
  t: (k: string) => k,
  translateAll: async () => {},
  speak: async () => {},
  liveMessage: '',
  setLiveMessage: () => {},
  captionsEnabled: true,
  toggleCaptions: () => {},
});

export default function ThemeLangProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<string>('en');
  const [loadedTranslations, setLoadedTranslations] = useState<Record<string, string>>(builtInTranslations['en']);
  const [liveMessage, setLiveMessage] = useState<string>('');
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(true);
  const mountedRef = useRef(true);
  const initialLangLoad = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    try {
      const saved = window.localStorage.getItem('theme') as Theme | null;
      if (saved) setTheme(saved);
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    } catch (e) {
      // ignore
    }

    try {
      const savedLang = window.localStorage.getItem('lang');
      if (savedLang) setLang(savedLang);
    } catch (e) {
      // ignore
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const initialThemeLoad = useRef(true);

  // theme change: add/remove dark class and enable a short transition
  useEffect(() => {
    try {
      window.localStorage.setItem('theme', theme);
    } catch (e) {}

    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // Skip the transition flash on first mount (no visible change yet)
    if (initialThemeLoad.current) {
      initialThemeLoad.current = false;
      return;
    }

    // add a transient class that enables animated transitions only on user toggle
    document.documentElement.classList.add('theme-transition');
    const t = setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 350);
    return () => clearTimeout(t);
  }, [theme]);

  // language change: persist, load locale file if available, apply to DOM
  useEffect(() => {
    try {
      window.localStorage.setItem('lang', lang);
    } catch (e) {}

    document.documentElement.lang = lang;

    let active = true;

    async function loadAndApply() {
      let dict: Record<string, string> = builtInTranslations[lang] || {};

      // try fetching a locale file from public/locales/{lang}.json
      try {
        const res = await fetch(`/locales/${lang}.json`);
        if (res.ok) {
          const json = await res.json();
          dict = { ...dict, ...json };
        } else {
          // try root language (en-US -> en)
          const base = lang.split('-')[0];
          if (base && base !== lang) {
            const res2 = await fetch(`/locales/${base}.json`);
            if (res2.ok) {
              const json2 = await res2.json();
              dict = { ...dict, ...json2 };
            }
          }
        }
      } catch (e) {
        // network/parse failed — keep built-in dict
      }

      // If we still have no translations and the user selected a non-English
      // language code, attempt an automatic machine translation of the built-in
      // English strings using a public LibreTranslate endpoint as a best-effort
      // fallback. This is optional and will fail silently if the endpoint is
      // unavailable or CORS blocks the request.
      if ((!dict || Object.keys(dict).length === 0) && lang && lang.split('-')[0] !== 'en') {
        const target = lang.split('-')[0];
        const sourceDict = builtInTranslations['en'] || {};
        const translated: Record<string, string> = {};

        const translateOne = async (text: string) => {
          try {
            const res = await fetch('https://libretranslate.de/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ q: text, source: 'en', target, format: 'text' }),
            });
            if (!res.ok) return null;
            const j = await res.json();
            return j.translatedText || null;
          } catch (e) {
            return null;
          }
        };

        const keys = Object.keys(sourceDict);
        for (const key of keys) {
          const sourceText = sourceDict[key] || key;
          const out = await translateOne(sourceText);
          translated[key] = out || sourceText;
          // be gentle on the free endpoint
          await new Promise((r) => setTimeout(r, 120));
        }

        // Merge any translated results
        dict = { ...dict, ...translated };
      }

      if (!active || !mountedRef.current) return;

      // On the initial mount, avoid a global opacity fade which can cause
      // a noticeable flicker across the app. Subsequent language changes use
      // a gentle fade to indicate the transition.
      if (initialLangLoad.current) {
        setLoadedTranslations(dict);
        initialLangLoad.current = false;
      } else {
        // quick visual fade-out to transition language
        try {
          if (typeof document !== 'undefined') {
            document.documentElement.style.transition = 'opacity 240ms var(--ease-in-out)';
            document.documentElement.style.opacity = '0.35';
          }
        } catch (e) {}

        setLoadedTranslations(dict);

        // Apply translations to elements with data-i18n attribute
        const nodes = Array.from(document.querySelectorAll('[data-i18n]')) as HTMLElement[];
        nodes.forEach((n) => {
          const key = n.getAttribute('data-i18n') || '';
          if (!n.getAttribute('data-i18n-default')) n.setAttribute('data-i18n-default', n.textContent || '');
          const translated = dict[key];
          if (translated) n.textContent = translated;
          else n.textContent = n.getAttribute('data-i18n-default') || '';
        });

        // fade back in
        try {
          if (typeof document !== 'undefined') {
            // small timeout to ensure DOM updates have flowed
            setTimeout(() => {
              document.documentElement.style.opacity = '1';
              // remove transition after it completes
              setTimeout(() => {
                try { document.documentElement.style.transition = ''; } catch (e) {}
              }, 300);
            }, 60);
          }
        } catch (e) {}
      }
    }

    loadAndApply();

    return () => {
      active = false;
    };
  }, [lang]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const t = (key: string) => loadedTranslations[key] ?? builtInTranslations[lang]?.[key] ?? builtInTranslations['en']?.[key] ?? key;

  const translateAll = async () => {
    // quick fade while re-applying translations
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.style.transition = 'opacity 220ms var(--ease-in-out)';
        document.documentElement.style.opacity = '0.35';
      }
    } catch (e) {}

    // re-run the language effect by re-applying loadedTranslations to the DOM
    const nodes = Array.from(document.querySelectorAll('[data-i18n]')) as HTMLElement[];
    nodes.forEach((n) => {
      const key = n.getAttribute('data-i18n') || '';
      if (!n.getAttribute('data-i18n-default')) n.setAttribute('data-i18n-default', n.textContent || '');
      const translated = loadedTranslations[key];
      if (translated) n.textContent = translated;
      else n.textContent = n.getAttribute('data-i18n-default') || '';
    });

    // Announce translation for assistive tech
    try {
      const msg = `${t('translatedTo') || 'Translated to'} ${lang}`;
      setLiveMessage(msg);
      // also speak a short confirmation when available
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        const synth = (window as any).speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(msg);
        u.lang = lang;
        synth.speak(u);
      }
    } catch (e) {
      // ignore
    }

    // fade back
    try {
      if (typeof document !== 'undefined') {
        setTimeout(() => {
          document.documentElement.style.opacity = '1';
          setTimeout(() => { try { document.documentElement.style.transition = ''; } catch (e) {} }, 300);
        }, 60);
      }
    } catch (e) {}
  };

  const speak = (text?: string) => {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !(window as any).speechSynthesis) {
        // fallback: set live message only
        const fallback = text || document.querySelector('h1')?.textContent || '';
        setLiveMessage(fallback);
        resolve();
        return;
      }

      const synth = (window as any).speechSynthesis;
      synth.cancel();

      const toSpeak = text || (() => {
        const h1 = document.querySelector('h1')?.textContent?.trim() || '';
        const p = document.querySelector('main')?.querySelector('p')?.textContent?.trim() || '';
        const summary = [t('title') || h1, p].filter(Boolean).join('. ');
        return summary || h1 || p || t('title');
      })();

      setLiveMessage(toSpeak);

      try {
        const u = new SpeechSynthesisUtterance(toSpeak);
        u.lang = lang;
        u.rate = 1.0;
        u.pitch = 1.0;
        u.volume = 1.0;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        synth.speak(u);
      } catch (e) {
        // fallback
        resolve();
      }
    });
  };

  return (
    <ThemeLangContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      lang,
      setLang,
      t,
      translateAll,
      speak,
      liveMessage,
      setLiveMessage,
      captionsEnabled,
      toggleCaptions: () => setCaptionsEnabled((v) => !v),
    }}>
      {children}
    </ThemeLangContext.Provider>
  );
}

export function useThemeLang() {
  return useContext(ThemeLangContext);
}
