import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { activityDB, Assignment, AssignmentResponse } from '@/js/services/offline/ActivityDB';
import { useAuthStore } from './authStore';
import { useDashboardStore } from './dashboardStore';
import { executeLogic } from '@/js/services/logicEngine';
import syncEngine  from '@/js/services/sync/SyncEngine';
import apiClient from '@/js/services/ApiClient';

interface FormState {
    assignment: Assignment | null;
    assignmentResponse: AssignmentResponse | null;
    formSchema: any | null;
    status: 'loading' | 'ready' | 'error';
    error: string | null;
    isNew: boolean;
}

export const useFormStore = defineStore('form', () => {
    const authStore = useAuthStore();
    const dashboardStore = useDashboardStore();

    const state = ref<FormState>({
        assignment: null,
        assignmentResponse: null,
        formSchema: null,
        status: 'loading',
        error: null,
        isNew: false,
    });

    const touchedFields = ref(new Set<string>());

    const pages = computed(() => state.value.formSchema?.pages || []);
    const responses = computed(() => state.value.assignmentResponse?.responses || {});

    const validationSummary = computed(() => {
        const summary = {
            errors: [] as any[],
            warnings: [] as any[],
            blanks: [] as any[],
            errorCount: 0,
            warningCount: 0,
            blankCount: 0,
            answeredCount: 0,
            totalVisibleCount: 0,
        };

        if (state.value.status !== 'ready' || !state.value.formSchema?.pages) {
            return summary;
        }

        const processQuestions = (questions: any[], currentResponses: any, parentId = '') => {
            if (!questions) return;

            for (const question of questions) {
                const questionId = parentId ? `${parentId}.${question.id}` : question.id;

                let isVisible = true;
                if (question.conditionalLogic?.showIf) {
                    try {
                        isVisible = executeLogic(question.conditionalLogic.showIf, currentResponses);
                    } catch (e) {
                        console.error(`Error executing showIf for ${questionId}:`, e);
                        isVisible = false;
                    }
                }

                if (!isVisible) {
                    continue;
                }

                summary.totalVisibleCount++;

                if (question.type === 'roster') {
                    const rosterItems = currentResponses[question.id] || [];
                    rosterItems.forEach((item: any, index: number) => {
                        processQuestions(question.questions, item, `${question.id}.${index}`);
                    });
                    continue;
                }

                const value = currentResponses[question.id];
                const rules = question.validation || {};
                const isBlank = value === undefined || value === null || value === '';
                let hasIssue = false;

                const checkAndPush = (condition: boolean, message: string) => {
                    if (condition) {
                        const level = rules.level || 'error';
                        const issue = { questionId, label: question.label, message, level };
                        if (level === 'warning') {
                            summary.warnings.push(issue);
                        } else {
                            summary.errors.push(issue);
                        }
                        hasIssue = true;
                    }
                };

                if (rules.required && isBlank) {
                    checkAndPush(true, 'Wajib diisi');
                } else if (isBlank) {
                    if (rules.requiredIf) {
                         try {
                            if (executeLogic(rules.requiredIf, currentResponses)) {
                                checkAndPush(true, 'Wajib diisi berdasarkan jawaban lain');
                            } else {
                                summary.blanks.push({ questionId, label: question.label, message: 'Belum diisi' });
                            }
                        } catch (e) {
                            console.error(`Error executing requiredIf for ${questionId}:`, e);
                        }
                    } else {
                        summary.blanks.push({ questionId, label: question.label, message: 'Belum diisi' });
                    }
                } else {
                    checkAndPush(rules.minLength && value.length < rules.minLength, `Minimal ${rules.minLength} karakter`);
                    checkAndPush(rules.maxLength && value.length > rules.maxLength, `Maksimal ${rules.maxLength} karakter`);
                    checkAndPush(rules.min && Number(value) < rules.min, `Nilai minimal ${rules.min}`);
                    checkAndPush(rules.max && Number(value) > rules.max, `Nilai maksimal ${rules.max}`);
                    
                    if (rules.custom) {
                        try {
                            const customResult = executeLogic(rules.custom, currentResponses);
                            if (customResult !== true) {
                                checkAndPush(true, customResult || 'Isian tidak valid');
                            }
                        } catch(e) {
                            console.error(`Error executing custom validation for ${questionId}:`, e);
                        }
                    }
                }

                if (!isBlank && !hasIssue) {
                    summary.answeredCount++;
                }
            }
        };

        state.value.formSchema.pages.forEach((page: any) => {
            processQuestions(page.questions, responses.value);
        });

        summary.errorCount = summary.errors.length;
        summary.warningCount = summary.warnings.length;
        summary.blankCount = summary.blanks.length;

        return summary;
    });

    const validationMap = computed(() => {
        const map = new Map<string, { message: string; level: string }>();
        const addValidation = (item: any) => {
             if (touchedFields.value.has(item.questionId)) {
                map.set(item.questionId, { message: item.message, level: item.level });
            }
        };
        validationSummary.value.errors.forEach(addValidation);
        validationSummary.value.warnings.forEach(addValidation);
        return map;
    });

    async function initializeNewAssignment(activityId: string, prefilledGeoData: any) {
        const user = authStore.user?.id;
        if (!user) {
            state.value.error = 'User not authenticated.';
            state.value.status = 'error';
            return;
        }

        const newAssignmentId = crypto.randomUUID();
        const now = new Date().toISOString();

        // Helper to get label from masterSls
        const getSlsLabel = (codeFull: string | null | undefined) => {
            if (!codeFull) return null;
            const sls = dashboardStore.masterSls.find(s => s.sls_id === codeFull);
            return sls ? sls.nama : null;
        };

        state.value.assignment = {
            id: newAssignmentId,
            kegiatan_statistik_id: activityId,
            ppl_id: user,
            pml_id: dashboardStore.activity?.pml_id_for_ppl || null,
            satker_id: authStore.user?.satker_id || null,
            assignment_label: prefilledGeoData.assignment_label || 'Penugasan Baru', // Use prefilled label if available
            prefilled_data: { ...prefilledGeoData },
            level_1_code: prefilledGeoData.level_1_code || null,
            level_1_label: prefilledGeoData.level_1_label || getSlsLabel(prefilledGeoData.level_1_code_full) || null,
            level_2_code: prefilledGeoData.level_2_code || null,
            level_2_label: prefilledGeoData.level_2_label || getSlsLabel(prefilledGeoData.level_2_code_full) || null,
            level_3_code: prefilledGeoData.level_3_code || null,
            level_3_label: prefilledGeoData.level_3_label || getSlsLabel(prefilledGeoData.level_3_code_full) || null,
            level_4_code: prefilledGeoData.level_4_code || null,
            level_4_label: prefilledGeoData.level_4_label || getSlsLabel(prefilledGeoData.level_4_code_full) || null,
            level_5_code: prefilledGeoData.level_5_code || null,
            level_5_label: prefilledGeoData.level_5_label || getSlsLabel(prefilledGeoData.level_5_code_full) || null,
            level_6_code: prefilledGeoData.level_6_code || null,
            level_6_label: prefilledGeoData.level_6_label || getSlsLabel(prefilledGeoData.level_6_code_full) || null,
            level_4_code_full: prefilledGeoData.level_4_code_full || null,
            level_6_code_full: prefilledGeoData.level_6_code_full || null,
            status: 'PENDING',
            created_at: now,
            updated_at: now,
            user_id: user,
        };

        state.value.assignmentResponse = {
            assignment_id: newAssignmentId,
            user_id: user,
            status: 'PENDING',
            version: 1,
            form_version_used: dashboardStore.formSchema?.form_version || 1,
            responses: {},
            created_at: now,
            updated_at: now,
        };

        // Immediately save to Dexie and update dashboard store
        const plainAssignment = JSON.parse(JSON.stringify(state.value.assignment));
        const plainAssignmentResponse = JSON.parse(JSON.stringify(state.value.assignmentResponse));

        await activityDB.assignments.add(plainAssignment);
        await activityDB.assignmentResponses.add(plainAssignmentResponse);
        dashboardStore.addAssignment(plainAssignment);


        // Load form schema from DexieDB
        const formSchemaRecord = await activityDB.formSchemas.get([activityId, user]);
        if (!formSchemaRecord) {
            state.value.error = `Form schema for activity ${activityId} not found in local DB. Please sync.`;
            state.value.status = 'error';
            return;
        }
        state.value.formSchema = formSchemaRecord.schema;
        
        state.value.status = 'ready';
        state.value.isNew = true;
        touchedFields.value.clear();
    }

    async function loadAssignmentFromLocalDB(assignmentId: string) {
        state.value.status = 'loading';
        state.value.error = null;
        touchedFields.value.clear();

        try {
            const user = authStore.user;
            if (!user?.id) {
                throw new Error('User not authenticated.');
            }

            const assignment = await activityDB.assignments.get(assignmentId);
            if (!assignment) {
                throw new Error(`Assignment with ID ${assignmentId} not found.`);
            }

            const formSchemaRecord = await activityDB.formSchemas.get([assignment.kegiatan_statistik_id, user.id]);
            if (!formSchemaRecord) {
                throw new Error(`Form schema for activity ${assignment.kegiatan_statistik_id} not found.`);
            }

            let response = await activityDB.assignmentResponses.get(assignmentId);
            if (!response) {
                if (authStore.activeRole === 'PML') {
                    throw new Error('Data for this assignment is not yet available. Please sync.');
                }
                response = {
                    assignment_id: assignmentId,
                    user_id: user.id,
                    status: 'Opened',
                    version: 1,
                    form_version_used: formSchemaRecord.schema?.form_version || 1,
                    responses: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                await activityDB.assignmentResponses.put(response);
            }

            if (typeof response.responses === 'string') {
                response.responses = JSON.parse(response.responses);
            }

            state.value.assignment = assignment;
            state.value.assignmentResponse = response;
            state.value.formSchema = formSchemaRecord.schema;
            state.value.isNew = false;
            state.value.status = 'ready';

        } catch (error: any) {
            state.value.error = error.message;
            state.value.status = 'error';
        }
    }

    function updateResponse(questionId: string, value: any) {
        if (state.value.assignmentResponse) {
            const keys = questionId.split('.');
            let current = state.value.assignmentResponse.responses;
            keys.forEach((key, index) => {
                if (index === keys.length - 1) {
                    current[key] = value;
                } else {
                    if (!current[key]) {
                        current[key] = isNaN(parseInt(keys[index + 1])) ? {} : [];
                    }
                    current = current[key];
                }
            });
        }
    }

    async function saveResponsesToLocalDB() {
        if (state.value.assignmentResponse && state.value.assignment) {
            state.value.assignmentResponse.updated_at = new Date().toISOString();
            
            // Also update the parent assignment's updated_at timestamp
            state.value.assignment.updated_at = new Date().toISOString();

            const plainResponse = JSON.parse(JSON.stringify(state.value.assignmentResponse));
            const plainAssignment = JSON.parse(JSON.stringify(state.value.assignment));

            await activityDB.assignmentResponses.put(plainResponse);
            await activityDB.assignments.put(plainAssignment);
            
            // --- FIX: Construct the combined object for the dashboard store ---
            const combinedAssignmentForDashboard = {
                ...plainAssignment,
                response: plainResponse,
            };

            dashboardStore.updateAssignmentInState(combinedAssignmentForDashboard);
        }
    }

    async function submit() {
        if (!state.value.assignment || !state.value.assignmentResponse || !authStore.user) {
            throw new Error('Cannot submit, essential data is missing.');
        }

        const isNew = state.value.isNew;
        const assignment = JSON.parse(JSON.stringify(state.value.assignment));
        const assignmentResponse = JSON.parse(JSON.stringify(state.value.assignmentResponse));
        
        if (isNew) {
            assignmentResponse.status = 'SUBMITTED_LOCAL'; // New status for locally submitted but not yet synced
            assignment.status = 'SUBMITTED_LOCAL'; // Also update assignment status for consistency in payload
        } else {
            assignmentResponse.status = 'Submitted by PPL'; // For existing assignments, status becomes 'Submitted by PPL'
        }
        assignmentResponse.updated_at = new Date().toISOString();
        
        await activityDB.assignmentResponses.put(assignmentResponse);

        await syncEngine.queueForSync(isNew ? 'createAssignment' : 'submitAssignment', {
            assignment,
            assignmentResponse,
            activityId: assignment.kegiatan_statistik_id, // Add activityId for submitAssignment
        });
    }
    
    return {
        state,
        pages,
        responses,
        validationSummary,
        validationMap,
        initializeNewAssignment,
        loadAssignmentFromLocalDB,
        updateResponse,
        saveResponsesToLocalDB,
        submit,
        touchField(questionId: string) {
            touchedFields.value.add(questionId);
        },
    };
});