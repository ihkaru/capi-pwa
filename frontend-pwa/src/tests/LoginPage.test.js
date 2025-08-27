import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import LoginPage from '../views/LoginPage.vue';
import { useAuthStore } from '../js/stores/auth';
import { useRouter } from 'vue-router';
// import ApiClient from '../js/services/ApiClient'; // Do NOT import the actual module when mocking it this way
// import { f7 } from 'framework7-vue'; // Do NOT import the actual module when mocking it this way

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock ApiClient
// This mock will be the 'default' export
const mockApiClient = {
  login: vi.fn(),
};
vi.mock('../js/services/ApiClient', () => ({
  default: mockApiClient, // Export the mock object as default
}));

// Mock Framework7 f7.toast
const mockF7Toast = {
  toast: {
    show: vi.fn(),
  },
};
vi.mock('framework7-vue', () => ({
  f7: mockF7Toast, // Export the mock object as f7
}));


describe('LoginPage', () => {
  let authStore;
  let mockRouterPush;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();

    // Assign the mocked functions here
    mockRouterPush = vi.mocked(useRouter()).push;
    mockApiClient.login.mockClear(); // Clear the mock on the directly exported object
    mockF7Toast.toast.show.mockClear(); // Clear the mock on the directly exported object
  });

  it('renders login form correctly', () => {
    const wrapper = mount(LoginPage);
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('button').text()).toBe('Login');
  });

  it('handles successful login', async () => {
    const mockToken = 'mock-token';
    const mockUser = { id: 1, name: 'Test User' };

    mockApiClient.login.mockResolvedValue({ token: mockToken, user: mockUser });

    const wrapper = mount(LoginPage);

    await wrapper.find('input[type="text"]').setValue('testuser');
    await wrapper.find('input[type="password"]').setValue('password');
    await wrapper.find('button').trigger('click');

    expect(mockApiClient.login).toHaveBeenCalledWith('testuser', 'password');
    expect(authStore.token).toBe(mockToken);
    expect(authStore.user).toEqual(mockUser);
    expect(mockRouterPush).toHaveBeenCalledWith('/home');
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
  });

  it('handles failed login', async () => {
    const errorMessage = 'Invalid credentials';
    mockApiClient.login.mockRejectedValue(new Error(errorMessage));

    const wrapper = mount(LoginPage);

    await wrapper.find('input[type="text"]').setValue('wronguser');
    await wrapper.find('input[type="password"]').setValue('wrongpass');
    await wrapper.find('button').trigger('click');

    expect(mockApiClient.login).toHaveBeenCalledWith('wronguser', 'wrongpass');
    expect(wrapper.find('.text-color-red').text()).toBe(errorMessage);
    expect(mockF7Toast.toast.show).toHaveBeenCalledWith({
      text: errorMessage,
      horizontalPosition: 'center',
      closeTimeout: 3000,
      cssClass: 'toast-error',
    });
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
  });

  it('shows loading state during login', async () => {
    mockApiClient.login.mockReturnValue(new Promise(() => {})); // Never resolve to keep loading

    const wrapper = mount(LoginPage);

    await wrapper.find('input[type="text"]').setValue('user');
    await wrapper.find('input[type="password"]').setValue('pass');
    await wrapper.find('button').trigger('click');

    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    expect(wrapper.find('button').attributes('preloader')).toBeDefined();
  });
});