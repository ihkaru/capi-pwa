import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/js/stores/authStore';
import { f7 } from 'framework7-vue'; // Import f7

// Placeholder types
interface LoginCredentials {
  email: string;
  password: string; // Changed from 'pass' to 'password' for consistency
}

interface User {
  id: string;
  satker_id: string | null;
  name: string;
  email: string;
  google_id?: string;
  google_avatar?: string;
  // Add other user properties if needed, e.g., roles
  role?: string; // Assuming role is directly on the user object for simplicity
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  refresh_token?: string; // Add refresh_token as it's used in login/refreshToken
}

interface Activity {
  id: string;
  name: string;
  year: number;
  user_role: 'PPL' | 'PML';
  status: string;
  start_date: string;
  end_date: string;
}

interface FormSchema {
  masters_used?: Array<{ type: string; version: number }>;
  level_definitions?: any; // Define more specifically if needed
  assignment_table_grouping_levels?: string[];
  assignment_table_columns?: Array<{ key: string; label: string }>;
  pages?: any; // Define more specifically if needed
  form_version?: number; // Add form_version from kegiatan_statistiks
}

interface MasterData {
  type: string;
  version: number;
  description?: string;
  data: any; // The actual master data JSON
  is_active?: boolean;
}

interface InitialActivityPayload {
  activity: Activity;
  assignments: Assignment[];
  assignmentResponses: AssignmentResponse[];
  form_schema: FormSchema;
  master_data: MasterData[];
  master_sls: any[]; // Define more specifically if needed
}

interface ServerUpdatePayload {
  assignments: Assignment[];
  assignmentResponses: AssignmentResponse[];
  // Add other types of updates as needed, e.g., master data updates
}

interface AssignmentResponse {
  assignment_id: string;
  status: string;
  version: number;
  form_version_used: number;
  responses: any; // JSON data, can be more specific if schema is known
  submitted_by_ppl_at?: string;
  reviewed_by_pml_at?: string;
  reviewed_by_admin_at?: string;
}

interface SyncResult {
  success: boolean;
  message?: string;
  // Add any other relevant properties from sync result
}

interface FileUploadResponse {
  success: boolean;
  fileUrl?: string;
  fileId?: string;
  message?: string;
}

interface ErrorLog {
  level: string;
  message: string;
  timestamp: string;
  details?: any;
}

/**
 * A type-safe, singleton API client for communicating with the Laravel backend.
 * It handles automatic authentication token injection and refreshing.
 */
class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: any[] = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_URL, // Changed from VITE_API_BASE_URL to VITE_API_URL
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Initializes the interceptors that depend on the Pinia store.
   * This must be called after the Pinia instance is installed on the Vue app.
   */
  public initialize() {
    this.initializeInterceptors();
  }

  private initializeInterceptors() {
    const authStore = useAuthStore();
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = authStore.token;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response.data, // THIS LINE IS CRUCIAL: Extracts data for successful responses
      async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
                return this.axiosInstance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const { access_token } = await this.refreshToken();
            authStore.setAuthState(access_token,user);
            this.axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + access_token;
            originalRequest.headers['Authorization'] = 'Bearer ' + access_token;
            this.processFailedQueue(null, access_token);
            return this.axiosInstance(originalRequest);
          } catch (err) {
            this.processFailedQueue(err, null);
            authStore.setToken(null);
            // In a real app, you would redirect to the login page
            return Promise.reject(err);
          } finally {
            this.isRefreshing = false;
          }
        }
        return Promise.reject(error.response.data);
      }
    );
  }

  private processFailedQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  public async get(url: string, config?: AxiosRequestConfig): Promise<any> {
    console.log(`ApiClient: Making GET request to: ${url}`);
    return this.axiosInstance.get(url, config);
  }

  /**
   * Authenticates the user.
   * @param {LoginCredentials} credentials - The user's login credentials.
   * @param {boolean} showLoading - Whether to show a loading preloader.
   * @returns {Promise<AuthResponse>} The authentication response.
   */
  public async login(credentials: LoginCredentials, showLoading = true): Promise<AuthResponse> {
    if (showLoading) {
      f7.dialog.preloader('Login...');
    }
    try {
      // 'response' sekarang adalah objek AuthResponse secara langsung
      const response: AuthResponse = await this.axiosInstance.post('/login', credentials);
      const { access_token, refresh_token, user } = response; // <-- PERBAIKAN
      const authStore = useAuthStore();
      authStore.setToken(access_token);
      authStore.setUser(user);
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }
      return response; // <-- PERBAIKAN
    } finally {
      if (showLoading) {
        f7.dialog.close();
      }
    }
  }

  /**
   * Sends Google credential to backend for login/registration.
   * @param {string} credential - The Google ID token.
   * @param {boolean} showLoading - Whether to show a loading preloader.
   * @returns {Promise<AuthResponse>} - User data and access token.
   */
  public async loginWithGoogle(credential: string, showLoading = true): Promise<AuthResponse> {
    console.log('Sending Google credential to backend...');
    if (showLoading) {
      f7.dialog.preloader('Login dengan Google...');
    }
    try {
      // Bypass interceptor's response transformation for this specific call
      // We will handle the .data extraction manually here
      const response = await this.axiosInstance.post(
        '/auth/google/callback',
        { token: credential },
        {
          transformResponse: axios.defaults.transformResponse, // Use default transformResponse
        }
      );

      console.log('Raw Axios response in loginWithGoogle:', response);
      console.log('Raw Axios response.data in loginWithGoogle:', response.data);

      // Ensure the data structure matches AuthResponse
      if (response.data && response.data.access_token && response.data.user) {
        const { access_token, refresh_token, user } = response.data; // Assuming backend returns these

        // --- BEGIN DEBUG LOG ---
        console.log('[ApiClient] User object received from backend:', JSON.stringify(user, null, 2));
        // --- END DEBUG LOG ---

        // FIX: Extract role from nested object if it exists.
        // The backend sends the role inside a `roles` array (e.g., user.roles[0].name)
        const userForStore = { ...user };
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          userForStore.role = user.roles[0].name;
          console.log(`[ApiClient] Extracted role '${userForStore.role}' from user object.`);
        } else {
          console.warn('[ApiClient] Could not find role in user.roles array. Using role from root if available, or undefined.');
          userForStore.role = user.role; // Fallback to root property
        }

        const authStore = useAuthStore(); // Get store instance inside the method
        authStore.setAuthState(access_token, userForStore);
        if (refresh_token) {
          localStorage.setItem('refreshToken', refresh_token);
        }
        return response.data; // Return the actual data
      } else {
        console.error('Unexpected response structure from Google login backend:', response.data);
        throw new Error('Unexpected response structure from backend.');
      }
    } catch (error) {
      // f7.dialog.close(); <-- Dihapus dari sini
      throw error;
    } finally {
      if (showLoading) {
        f7.dialog.close(); // Selalu ditutup di sini
      }
    }
  }
  /**
   * Logs the user out.
   * @param {boolean} showLoading - Whether to show a loading preloader.
   * @returns {Promise<void>}
   */
  public async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/logout');
    } catch (error) {
      // Bahkan jika logout dari server gagal (misal: token sudah tidak valid),
      // kita tetap ingin melanjutkan proses logout di sisi klien.
      // Jadi kita tangkap error di sini dan log, tapi tidak melemparnya lagi.
      console.error('API call to /logout failed, proceeding with client-side logout anyway:', error);
    }
  }

  /**
   * Refreshes the authentication token.
   * @returns {Promise<RefreshTokenResponse>} The new token response.
   */
  public async refreshToken(): Promise<AuthResponse> {
    // Changed return type to AuthResponse
    // This should call the refresh token endpoint
    // The implementation details depend on the backend (e.g., sending a refresh token)
    const response = await this.axiosInstance.post('/token/refresh', {
      refreshToken: localStorage.getItem('refreshToken'),
    });
    const { access_token, refresh_token, user } = response.data;
    const authStore = useAuthStore();
    authStore.setToken(access_token);
    authStore.setUser(user); // Update user data if it comes with refresh
    if (refresh_token) {
      localStorage.setItem('refreshToken', refresh_token);
    }
    return response.data; // Return the full AuthResponse
  }

  // --- Methods for Onboarding & Two-Way Sync ---

  /**
   * Fetches the list of statistical activities assigned to the current user.
   * @param {boolean} showLoading - Whether to show a loading preloader.
   * @returns {Promise<Activity[]>}
   */
  public async getActivitiesForUser(): Promise<Activity[]> {
    console.log('ApiClient: Fetching activities from API...');
    try {
      const response = await this.axiosInstance.get('/activities');
      return response.data;
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error; // Re-throw to be caught by the calling component
    }
  }

  /**
   * Fetches initial data for a specific activity, including assignments, form schema, and master data.
   * @param {string} activityId - The ID of the activity.
   * @param {boolean} showLoading - Whether to show a loading preloader.
   * @returns {Promise<InitialActivityPayload>} - The initial data for the activity.
   */
  public async getInitialData(
    activityId: string,
    showLoading = true
  ): Promise<InitialActivityPayload> {
    console.log(`Fetching initial data for activity ${activityId} from API...`);
    if (showLoading) {
      f7.dialog.preloader('Memuat Data Awal Kegiatan...');
    }
    try {
      const response = await this.axiosInstance.get(`/activities/${activityId}/initial-data`);
      return response.data; // Assuming API Resource returns data directly
    } catch (error) {
      console.error(`Error fetching initial data for activity ${activityId}:`, error);
      throw error;
    } finally {
      if (showLoading) {
        f7.dialog.close();
      }
    }
  }

  /**
   * Fetches delta updates for a specific activity.
   * @param {string} activityId - The ID of the activity.
   * @param {string} lastSyncTimestamp - The timestamp of the last successful sync for this activity.
   * @returns {Promise<ServerUpdatePayload>} The server updates.
   */
  public async getActivitiesDelta(
    activityId: string,
    lastSyncTimestamp: string
  ): Promise<ServerUpdatePayload> {
    console.log(`Fetching delta updates for activity ${activityId} since ${lastSyncTimestamp}...`);
    try {
      const response = await this.axiosInstance.get(`/activities/${activityId}/updates`, {
        params: { since: lastSyncTimestamp },
      });
      return response.data; // Assuming response.data directly contains the payload
    } catch (error) {
      console.error(`Error fetching delta updates for activity ${activityId}:`, error);
      throw error;
    }
  }

  /**
   * Fetches all data (assignments and responses) for a specific activity.
   * This is intended for full sync/overwrite scenarios.
   * @param {string} activityId - The ID of the activity.
   * @returns {Promise<ServerUpdatePayload>} All assignments and responses for the activity.
   */
  public async getAllActivityData(activityId: string): Promise<ServerUpdatePayload> {
    console.log(`Fetching all data for activity ${activityId}...`);
    try {
      const response = await this.axiosInstance.get(`/activities/${activityId}/all-data`);
      return response.data; // Assuming response.data directly contains the payload
    } catch (error) {
      console.error(`Error fetching all data for activity ${activityId}:`, error);
      throw error;
    }
  }

  // --- Methods for Data Submission ---

  /**
   * Submits a batch of completed assignments.
   * @param {string} activityId - The ID of the activity.
   * @param {AssignmentResponse[]} payload - The batch of assignments.
   * @returns {Promise<SyncResult>} The result of the sync.
   */
  public async submitAssignmentBatch(
    activityId: string,
    payload: AssignmentResponse[]
  ): Promise<SyncResult> {
    return this.axiosInstance.post(`/activities/${activityId}/assignments`, payload);
  }

  /**
   * Updates the status of an assignment response.
   * @param {string} assignmentId - The ID of the assignment response.
   * @param {string} status - The new status.
   * @param {string} [notes] - Optional notes for the status change (e.g., rejection reason).
   * @returns {Promise<void>}
   */
  public async updateAssignmentStatus(
    assignmentId: string,
    status: string,
    notes?: string
  ): Promise<void> {
    return this.axiosInstance.post(`/assignments/${assignmentId}/status`, { status, notes });
  }

  public async uploadPhoto(assignmentId: string, photo: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('photo', photo);

    // Log FormData contents for debugging
    for (let pair of formData.entries()) {
      console.log(`[ApiClient] FormData entry: ${pair[0]}, ${pair[1]}`);
    }

    return this.axiosInstance.post(
      `/assignments/${assignmentId}/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  /**
   * Checks with the server what actions are currently allowed for a specific assignment.
   * Crucial for the PML's Approve/Reject buttons. Requires an online connection.
   * @param {string} assignmentId - The ID of the assignment to check.
   * @returns {Promise<string[]>} An array of strings, e.g., ['APPROVE', 'REJECT'].
   */
  public async getAllowedActions(assignmentId: string): Promise<string[]> {
    try {
      const response: string[] = await this.axiosInstance.get(`/assignments/${assignmentId}/allowed-actions`);
      return response; // Interceptor handles .data extraction
    } catch (error) {
      console.error(`Error fetching allowed actions for assignment ${assignmentId}:`, error);
      // Return empty array on failure so the UI doesn't show buttons.
      return [];
    }
  }

  /**
   * Uploads a photo for an assignment.
   * @param {string} activityId - The ID of the activity.
   * @param {string} interviewId - The ID of the interview.
   * @param {File} photo - The photo file to upload.
   * @returns {Promise<FileUploadResponse>} The response from the file upload.
   */
  public async uploadAssignmentPhoto(
    activityId: string,
    interviewId: string,
    photo: File
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('photo', photo);

    return this.axiosInstance.post(
      `/activities/${activityId}/interviews/${interviewId}/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  // --- Methods for Diagnostics ---

  /**
   * Posts error logs to the server.
   * @param {ErrorLog[]} logs - An array of error logs.
   * @returns {Promise<void>}
   */
  public async postErrorLogs(logs: ErrorLog[]): Promise<void> {
    return this.axiosInstance.post('/diagnostics/logs', logs);
  }
}

const apiClient = new ApiClient();

export default apiClient;
