
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LoginPage from '../../views/LoginPage.vue';
import { useAuthStore } from '../../js/stores/auth';
import ApiClient from '../../js/services/ApiClient';

// Mock Framework7 components
const createComponentMock = (name, template = `<div><slot /></div>`, props = []) => ({
  name,
  template,
  props,
});

const f7Page = createComponentMock('f7-page');
const f7LoginScreenTitle = createComponentMock('f7-login-screen-title', `<div>CAPI Login</div>`);
const f7List = createComponentMock('f7-list');
const f7ListInput = createComponentMock(
  'f7-list-input',
  `<input :type="type" :placeholder="placeholder" :value="value" @input="$emit('input', $event.target.value)" />`,
  ['type', 'placeholder', 'value']
);
const f7ListButton = createComponentMock('f7-list-button', `<button>{{ title }}</button>`, ['title']);
const f7Block = createComponentMock('f7-block');

// Mock the router
const mockRouter = {
  push: vi.fn(),
};

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

// Mock ApiClient
vi.mock('../../js/services/ApiClient', () => ({
  default: {
    login: vi.fn(),
  },
}));

// Mock f7.toast within the vi.mock for framework7-vue
vi.mock('framework7-vue', async (importOriginal) => {
  const actual = await importOriginal();
  const mockF7Toast = {
    show: vi.fn(),
  };
  return {
    ...actual,
    f7: {
      toast: mockF7Toast,
    },
  };
});

describe('LoginPage.vue', () => {
  let wrapper;
  let mockF7Toast;

  beforeEach(async () => { // Make beforeEach async
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Dynamically import f7 after mocks are set up
    const { f7 } = await import('framework7-vue');
    mockF7Toast = f7.toast;

    wrapper = mount(LoginPage, {
      global: {
        components: {
          f7Page,
          f7LoginScreenTitle,
          f7List,
          f7ListInput,
          f7ListButton,
          f7Block,
        },
      },
    });
  });

  it('renders the login form', () => {
    expect(wrapper.find('f7-login-screen-title').text()).toBe('CAPI Login');
    expect(wrapper.findAll('f7-list-input').length).toBe(2);
    expect(wrapper.find('f7-list-button').text()).toContain('Login'); // Use toContain because of slot
  });

  it('calls the login action when the login button is clicked', async () => {
    const authStore = useAuthStore();

    const usernameInput = wrapper.findAll('f7-list-input')[0];
    const passwordInput = wrapper.findAll('f7-list-input')[1];
    const loginButton = wrapper.find('f7-list-button');

    await usernameInput.find('input').setValue('testuser');
    await passwordInput.find('input').setValue('password');

    ApiClient.login.mockResolvedValue({ token: 'test-token', user: { id: 1, name: 'Test User' } });

    await loginButton.trigger('click');

    expect(ApiClient.login).toHaveBeenCalledWith('testuser', 'password');
    expect(authStore.token).toBe('test-token');
    expect(authStore.user).toEqual({ id: 1, name: 'Test User' });
    expect(mockRouter.push).toHaveBeenCalledWith('/home');
  });

  it('shows an error message on failed login', async () => {
    const usernameInput = wrapper.findAll('f7-list-input')[0];
    const passwordInput = wrapper.findAll('f7-list-input')[1];
    const loginButton = wrapper.find('f7-list-button');

    await usernameInput.find('input').setValue('testuser');
    await passwordInput.find('input').setValue('password');

    ApiClient.login.mockRejectedValue(new Error('Invalid credentials'));

    await loginButton.trigger('click');

    expect(wrapper.find('.text-color-red').text()).toBe('Invalid credentials');
    expect(mockF7Toast.show).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Invalid credentials',
    }));
  });
});
