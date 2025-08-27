// Impor komponen halaman Anda
import HomePage from '@/views/HomePage.vue';
import LoginPage from '@/views/LoginPage.vue';
import InterviewFormPage from '@/views/InterviewFormPage.vue';
import ActivityDashboardPage from '@/views/ActivityDashboardPage.vue';
import AssignmentGroupPage from '@/views/AssignmentGroupPage.vue';
import SyncDashboard from '@/views/SyncDashboard.vue';

// Impor store Anda
import { useAuthStore } from '@/js/stores/auth.ts'; // Selalu gunakan ekstensi file
import AssignmentListPage from '@/views/AssignmentListPage.vue';

/**
 * Navigation guard untuk Framework7.
 * Memeriksa apakah pengguna sudah terotentikasi.
 */
const authGuard = ({ resolve }) => {
  const authStore = useAuthStore();
  if (authStore.isAuthenticated) {
    // 1. Jika pengguna terotentikasi, izinkan navigasi.
    resolve();
  } else {
    // 2. Jika tidak, alihkan ke halaman login.
    // Di F7, resolve() dengan path akan melakukan redirect.
    resolve({ path: '/', name: 'Login' });
  }
};

// --- Definisi Rute Aplikasi untuk Framework7 ---
const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginPage,
  },
  {
    path: '/home/', // Framework7 sering menggunakan trailing slash
    name: 'Home',
    component: HomePage,
    beforeEnter: authGuard,
  },
  {
    path: '/interview/:interviewId/',
    name: 'InterviewForm',
    component: InterviewFormPage,
    beforeEnter: authGuard,
  },
  {
    path: '/activity/:activityId/dashboard',
    name: 'ActivityDashboard',
    component: ActivityDashboardPage,
    beforeEnter: authGuard,
  },
  {
    path: '/activity/:activityId/groups/',
    name: 'AssignmentGroups',
    component: AssignmentGroupPage,
    beforeEnter: authGuard,
  },
  {
    path: '/activity/:activityId/group/:groupName/',
    name: 'AssignmentList',
    component: AssignmentListPage,
    beforeEnter: authGuard,
  },
  {
    path: '/sync-dashboard/',
    name: 'SyncDashboard',
    component: SyncDashboard,
    beforeEnter: authGuard,
  },
];

export default routes;