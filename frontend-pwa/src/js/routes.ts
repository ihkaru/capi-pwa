import { useAuthStore } from '@/js/stores/authStore';
import HomePage from '@/views/HomePage.vue';
import LoginPage from '@/views/LoginPage.vue';
import InterviewFormPage from '@/views/InterviewFormPage.vue';
import ActivityDashboardPage from '@/views/ActivityDashboardPage.vue';
import AssignmentGroupPage from '@/views/AssignmentGroupPage.vue';
import SyncDashboard from '@/views/SyncDashboard.vue';
import AssignmentListPage from '@/views/AssignmentListPage.vue';
import RosterItemPage from '@/views/RosterItemPage.vue';

const waitForAuth = () => {
  const authStore = useAuthStore();
  if (authStore.isInitialized) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const unsubscribe = authStore.$subscribe((mutation, state) => {
      if (state.isInitialized) {
        unsubscribe();
        resolve();
      }
    });
  });
};

const createAuthRoute = (component) => {
  return {
    async: async ({ resolve }) => {
      await waitForAuth();
      const authStore = useAuthStore();
      if (authStore.isAuthenticated) {
        resolve({ component });
      } else {
        resolve({ path: '/', name: 'Login' });
      }
    },
  };
};

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginPage,
  },
  {
    path: '/home/',
    name: 'Home',
    ...createAuthRoute(HomePage),
  },
  {
    path: '/assignment/new',
    name: 'NewAssignmentForm',
    ...createAuthRoute(InterviewFormPage),
  },
  {
    path: '/assignment/:assignmentId/',
    name: 'InterviewForm',
    ...createAuthRoute(InterviewFormPage),
  },
  {
    path: '/activity/:activityId/dashboard',
    name: 'ActivityDashboard',
    ...createAuthRoute(ActivityDashboardPage),
  },
  {
    path: '/activity/:activityId/groups/',
    name: 'AssignmentGroups',
    ...createAuthRoute(AssignmentGroupPage),
  },
  {
    path: '/activity/:activityId/group/:groupName/',
    name: 'AssignmentList',
    ...createAuthRoute(AssignmentListPage),
  },
  {
    path: '/sync-dashboard/',
    name: 'SyncDashboard',
    ...createAuthRoute(SyncDashboard),
  },
  {
    path: '/interview/:assignmentId/roster/:rosterQuestionId/:index',
    name: 'RosterItem',
    ...createAuthRoute(RosterItemPage),
  },
];

export default routes;
