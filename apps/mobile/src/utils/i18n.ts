/**
 * Read Master Mobile - i18n Configuration
 *
 * Internationalization setup using i18next and react-i18next.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================================
// Translation Resources
// ============================================================================

const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: "Loading...",
        error: "Error",
        retry: "Retry",
        cancel: "Cancel",
        save: "Save",
        delete: "Delete",
        edit: "Edit",
        done: "Done",
        back: "Back",
        next: "Next",
        search: "Search",
        noResults: "No results found",
      },

      // Library
      library: {
        title: "Library",
        searchPlaceholder: "Search books...",
        emptyTitle: "Your library is empty",
        emptyDescription: "Import your first book to get started",
        importBook: "Import Book",
        filters: {
          all: "All",
          reading: "Reading",
          completed: "Completed",
          wantToRead: "Want to Read",
        },
      },

      // Reader
      reader: {
        tableOfContents: "Table of Contents",
        bookmarks: "Bookmarks",
        annotations: "Annotations",
        search: "Search",
        settings: "Settings",
        noBookmarks: "No bookmarks yet",
        noAnnotations: "No annotations yet",
        addBookmark: "Add Bookmark",
        bookmarkAdded: "Bookmark added",
        bookmarkRemoved: "Bookmark removed",
        highlight: "Highlight",
        addNote: "Add Note",
        searchPlaceholder: "Search in book...",
        searchResults: "{{count}} results",
        fontSize: "Font Size",
        fontFamily: "Font",
        lineSpacing: "Line Spacing",
        margins: "Margins",
        theme: "Theme",
        themes: {
          light: "Light",
          dark: "Dark",
          sepia: "Sepia",
        },
      },

      // Flashcards
      flashcards: {
        title: "Flashcards",
        dueToday: "Due Today",
        review: "Review",
        noCardsDue: "No cards due",
        noCardsDueDescription: "Great job! Come back later for more reviews.",
        cardsRemaining: "{{count}} cards remaining",
        showAnswer: "Show Answer",
        again: "Again",
        hard: "Hard",
        good: "Good",
        easy: "Easy",
        stats: {
          total: "Total",
          due: "Due",
          learning: "Learning",
          mature: "Mature",
        },
      },

      // Social
      social: {
        title: "Social",
        feed: "Feed",
        leaderboard: "Leaderboard",
        clubs: "Clubs",
        emptyFeed: "No activity yet",
        emptyLeaderboard: "No rankings yet",
        periods: {
          daily: "Daily",
          weekly: "Weekly",
          monthly: "Monthly",
          allTime: "All Time",
        },
        activities: {
          bookCompleted: "finished reading",
          streak: "day reading streak!",
          achievement: "earned",
          review: "reviewed",
        },
      },

      // Settings
      settings: {
        title: "Settings",
        account: "Account",
        profile: "Profile",
        subscription: "Subscription",
        appearance: "Appearance",
        theme: "Theme",
        language: "Language",
        reading: "Reading",
        defaultFontSize: "Default Font Size",
        notifications: "Notifications",
        reviewReminders: "Review Reminders",
        streakReminders: "Streak Reminders",
        security: "Security",
        biometricAuth: "Biometric Authentication",
        appLock: "App Lock",
        about: "About",
        version: "Version",
        privacyPolicy: "Privacy Policy",
        termsOfService: "Terms of Service",
        signOut: "Sign Out",
        signOutConfirm: "Are you sure you want to sign out?",
      },

      // Auth
      auth: {
        welcome: "Welcome to Read Master",
        tagline: "AI-powered reading comprehension",
        signIn: "Sign In",
        signUp: "Sign Up",
        signInWith: "Sign in with {{provider}}",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        forgotPassword: "Forgot Password?",
        noAccount: "Don't have an account?",
        haveAccount: "Already have an account?",
        createAccount: "Create Account",
        verifyEmail: "Verify Your Email",
        verifyEmailDescription: "We've sent a verification code to {{email}}",
        verificationCode: "Verification Code",
        verify: "Verify",
        resendCode: "Resend Code",
      },
    },
  },

  ar: {
    translation: {
      common: {
        loading: "جار التحميل...",
        error: "خطأ",
        retry: "إعادة المحاولة",
        cancel: "إلغاء",
        save: "حفظ",
        delete: "حذف",
        edit: "تعديل",
        done: "تم",
        back: "رجوع",
        next: "التالي",
        search: "بحث",
        noResults: "لا توجد نتائج",
      },
      library: {
        title: "المكتبة",
        searchPlaceholder: "البحث في الكتب...",
        emptyTitle: "مكتبتك فارغة",
        emptyDescription: "استورد كتابك الأول للبدء",
        importBook: "استيراد كتاب",
        filters: {
          all: "الكل",
          reading: "قيد القراءة",
          completed: "مكتملة",
          wantToRead: "أريد قراءتها",
        },
      },
      reader: {
        tableOfContents: "جدول المحتويات",
        bookmarks: "الإشارات المرجعية",
        annotations: "التعليقات",
        search: "بحث",
        settings: "الإعدادات",
      },
      flashcards: {
        title: "البطاقات التعليمية",
        dueToday: "مستحقة اليوم",
        review: "مراجعة",
        noCardsDue: "لا توجد بطاقات مستحقة",
        showAnswer: "إظهار الإجابة",
        again: "مرة أخرى",
        hard: "صعب",
        good: "جيد",
        easy: "سهل",
      },
      social: {
        title: "اجتماعي",
        feed: "النشاط",
        leaderboard: "المتصدرين",
        clubs: "النوادي",
      },
      settings: {
        title: "الإعدادات",
        account: "الحساب",
        appearance: "المظهر",
        theme: "السمة",
        signOut: "تسجيل الخروج",
      },
      auth: {
        welcome: "مرحبا بك في ريد ماستر",
        signIn: "تسجيل الدخول",
        signUp: "إنشاء حساب",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
      },
    },
  },

  es: {
    translation: {
      common: {
        loading: "Cargando...",
        error: "Error",
        retry: "Reintentar",
        cancel: "Cancelar",
        save: "Guardar",
        delete: "Eliminar",
        edit: "Editar",
        done: "Hecho",
        back: "Atrás",
        next: "Siguiente",
        search: "Buscar",
        noResults: "Sin resultados",
      },
      library: {
        title: "Biblioteca",
        searchPlaceholder: "Buscar libros...",
        emptyTitle: "Tu biblioteca está vacía",
        emptyDescription: "Importa tu primer libro para comenzar",
        importBook: "Importar Libro",
        filters: {
          all: "Todos",
          reading: "Leyendo",
          completed: "Completados",
          wantToRead: "Quiero Leer",
        },
      },
      flashcards: {
        title: "Tarjetas",
        dueToday: "Para Hoy",
        review: "Revisar",
        noCardsDue: "No hay tarjetas pendientes",
        showAnswer: "Mostrar Respuesta",
        again: "Otra vez",
        hard: "Difícil",
        good: "Bien",
        easy: "Fácil",
      },
      social: {
        title: "Social",
        feed: "Actividad",
        leaderboard: "Clasificación",
        clubs: "Clubes",
      },
      settings: {
        title: "Configuración",
        account: "Cuenta",
        appearance: "Apariencia",
        theme: "Tema",
        signOut: "Cerrar Sesión",
      },
      auth: {
        welcome: "Bienvenido a Read Master",
        signIn: "Iniciar Sesión",
        signUp: "Registrarse",
        email: "Correo electrónico",
        password: "Contraseña",
      },
    },
  },

  ja: {
    translation: {
      common: {
        loading: "読み込み中...",
        error: "エラー",
        retry: "再試行",
        cancel: "キャンセル",
        save: "保存",
        delete: "削除",
        edit: "編集",
        done: "完了",
        back: "戻る",
        next: "次へ",
        search: "検索",
        noResults: "結果なし",
      },
      library: {
        title: "ライブラリ",
        searchPlaceholder: "本を検索...",
        emptyTitle: "ライブラリは空です",
        emptyDescription: "最初の本をインポートして始めましょう",
        importBook: "本をインポート",
        filters: {
          all: "すべて",
          reading: "読書中",
          completed: "完了",
          wantToRead: "読みたい",
        },
      },
      flashcards: {
        title: "フラッシュカード",
        dueToday: "今日の分",
        review: "復習",
        noCardsDue: "復習するカードはありません",
        showAnswer: "答えを表示",
        again: "もう一度",
        hard: "難しい",
        good: "良い",
        easy: "簡単",
      },
      social: {
        title: "ソーシャル",
        feed: "フィード",
        leaderboard: "ランキング",
        clubs: "クラブ",
      },
      settings: {
        title: "設定",
        account: "アカウント",
        appearance: "外観",
        theme: "テーマ",
        signOut: "ログアウト",
      },
      auth: {
        welcome: "Read Masterへようこそ",
        signIn: "ログイン",
        signUp: "新規登録",
        email: "メールアドレス",
        password: "パスワード",
      },
    },
  },

  zh: {
    translation: {
      common: {
        loading: "加载中...",
        error: "错误",
        retry: "重试",
        cancel: "取消",
        save: "保存",
        delete: "删除",
        edit: "编辑",
        done: "完成",
        back: "返回",
        next: "下一步",
        search: "搜索",
        noResults: "无结果",
      },
      library: {
        title: "书库",
        searchPlaceholder: "搜索书籍...",
        emptyTitle: "书库为空",
        emptyDescription: "导入您的第一本书开始阅读",
        importBook: "导入书籍",
        filters: {
          all: "全部",
          reading: "阅读中",
          completed: "已完成",
          wantToRead: "想读",
        },
      },
      flashcards: {
        title: "闪卡",
        dueToday: "今日待学",
        review: "复习",
        noCardsDue: "没有待复习的卡片",
        showAnswer: "显示答案",
        again: "重来",
        hard: "困难",
        good: "良好",
        easy: "简单",
      },
      social: {
        title: "社交",
        feed: "动态",
        leaderboard: "排行榜",
        clubs: "俱乐部",
      },
      settings: {
        title: "设置",
        account: "账户",
        appearance: "外观",
        theme: "主题",
        signOut: "退出登录",
      },
      auth: {
        welcome: "欢迎使用 Read Master",
        signIn: "登录",
        signUp: "注册",
        email: "邮箱",
        password: "密码",
      },
    },
  },

  tl: {
    translation: {
      common: {
        loading: "Naglo-load...",
        error: "Error",
        retry: "Subukang muli",
        cancel: "Kanselahin",
        save: "I-save",
        delete: "Burahin",
        edit: "I-edit",
        done: "Tapos na",
        back: "Bumalik",
        next: "Susunod",
        search: "Maghanap",
        noResults: "Walang resulta",
      },
      library: {
        title: "Library",
        searchPlaceholder: "Maghanap ng libro...",
        emptyTitle: "Walang laman ang iyong library",
        emptyDescription: "Mag-import ng unang libro para magsimula",
        importBook: "Mag-import ng Libro",
        filters: {
          all: "Lahat",
          reading: "Binabasa",
          completed: "Natapos",
          wantToRead: "Gustong Basahin",
        },
      },
      flashcards: {
        title: "Flashcards",
        dueToday: "Para Ngayon",
        review: "Review",
        noCardsDue: "Walang cards na kailangang i-review",
        showAnswer: "Ipakita ang Sagot",
        again: "Ulit",
        hard: "Mahirap",
        good: "Okay",
        easy: "Madali",
      },
      settings: {
        title: "Settings",
        account: "Account",
        appearance: "Itsura",
        theme: "Tema",
        signOut: "Mag-sign out",
      },
      auth: {
        welcome: "Maligayang pagdating sa Read Master",
        signIn: "Mag-sign in",
        signUp: "Mag-sign up",
        email: "Email",
        password: "Password",
      },
    },
  },
};

// ============================================================================
// Language Detection
// ============================================================================

const LANGUAGE_KEY = "readmaster:language";

async function getStoredLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

async function storeLanguage(language: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Ignore storage errors
  }
}

function getDeviceLanguage(): string {
  const locale = Localization.locale;
  const languageCode = locale.split("-")[0];

  // Check if we support this language
  if (languageCode in resources) {
    return languageCode;
  }

  return "en";
}

// ============================================================================
// Initialize i18n
// ============================================================================

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Load stored language preference
getStoredLanguage().then((language) => {
  if (language && language in resources) {
    i18n.changeLanguage(language);
  }
});

// ============================================================================
// Language Change Helper
// ============================================================================

export async function changeLanguage(language: string): Promise<void> {
  if (language in resources) {
    await i18n.changeLanguage(language);
    await storeLanguage(language);
  }
}

export const supportedLanguages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog" },
];

export default i18n;
