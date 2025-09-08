import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { activityDB, Assignment, AssignmentResponse } from '@/js/services/offline/ActivityDB';
import { useAuthStore } from './authStore';
import { useDashboardStore } from './dashboardStore';
import { executeLogic } from '@/js/services/logicEngine';
import syncEngine from '@/js/services/sync/SyncEngine';
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
                    checkAndPush(!!rules.minLength && value.length < rules.minLength, `Minimal ${rules.minLength} karakter`);
                    checkAndPush(!!rules.maxLength && value.length > rules.maxLength, `Maksimal ${rules.maxLength} karakter`);
                    checkAndPush(!!rules.min && Number(value) < rules.min, `Nilai minimal ${rules.min}`);
                    checkAndPush(!!rules.max && Number(value) > rules.max, `Nilai maksimal ${rules.max}`);

                    if (rules.custom) {
                        try {
                            const customResult = executeLogic(rules.custom, currentResponses);
                            if (customResult !== true) {
                                checkAndPush(true, customResult || 'Isian tidak valid');
                            }
                        } catch (e) {
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
        console.log('[CAPI-DEBUG] formStore: initializeNewAssignment started.', { activityId, prefilledGeoData });
        const user = authStore.user?.id;
        if (!user) {
            state.value.error = 'User not authenticated.';
            state.value.status = 'error';
            console.error('[CAPI-DEBUG] formStore: User not authenticated.');
            return;
        }

        const newAssignmentId = crypto.randomUUID();
        const now = new Date().toISOString();

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
            assignment_label: prefilledGeoData.assignment_label || 'Penugasan Baru',
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
        console.log('[CAPI-DEBUG] formStore: Created new assignment object:', JSON.parse(JSON.stringify(state.value.assignment)));

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

        const plainAssignment = JSON.parse(JSON.stringify(state.value.assignment));
        const plainAssignmentResponse = JSON.parse(JSON.stringify(state.value.assignmentResponse));

        console.log('[CAPI-DEBUG] formStore: Adding new assignment to DexieDB.');
        await activityDB.assignments.add(plainAssignment);
        await activityDB.assignmentResponses.add(plainAssignmentResponse);

        console.log('[CAPI-DEBUG] formStore: Calling dashboardStore.addAssignment.');
        dashboardStore.addAssignment(plainAssignment);

        const formSchemaRecord = await activityDB.formSchemas.get([activityId, user]);
        if (!formSchemaRecord) {
            state.value.error = `Form schema for activity ${activityId} not found in local DB. Please sync.`;
            state.value.status = 'error';
            console.error(`[CAPI-DEBUG] formStore: Form schema for activity ${activityId} not found.`);
            return;
        }
        state.value.formSchema = formSchemaRecord.schema;

        state.value.status = 'ready';
        state.value.isNew = true;
        touchedFields.value.clear();
        console.log('[CAPI-DEBUG] formStore: initializeNewAssignment finished.');
    } // <-- FIX: Added the missing closing brace for the function

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
                        // Check if the next key is a number to decide between object or array
                        current[key] = isNaN(parseInt(keys[index + 1])) ? {} : [];
                    }
                    current = current[key];
                }
            });
        }
    }

    function updateAssignmentLabel() {
        const template = state.value.formSchema?.assignment_label_template;
        if (!template || !state.value.assignment) {
            return;
        }

        const currentResponses = state.value.assignmentResponse?.responses || {};

        const newLabel = template.replace(/{(\w+)}/g, (_match: string, placeholder: string) => {
            return currentResponses[placeholder] || '';
        });

        if (state.value.assignment.assignment_label !== newLabel) {
            state.value.assignment.assignment_label = newLabel;
        }
    }

    async function saveResponsesToLocalDB() {
        if (state.value.assignmentResponse && state.value.assignment) {
            const now = new Date().toISOString();
            state.value.assignmentResponse.updated_at = now;
            state.value.assignment.updated_at = now;

            const plainResponse = JSON.parse(JSON.stringify(state.value.assignmentResponse));
            const plainAssignment = JSON.parse(JSON.stringify(state.value.assignment));

            await activityDB.assignmentResponses.put(plainResponse);
            await activityDB.assignments.put(plainAssignment);

            const combinedAssignmentForDashboard = {
                ...plainAssignment,
                response: plainResponse,
            };

            dashboardStore.updateAssignmentInState(combinedAssignmentForDashboard);
        }
    }

    async function submit() {
        if (!state.value.assignment || !state.value.assignmentResponse || !authStore.user || !state.value.formSchema) {
            throw new Error('Cannot submit, essential data is missing.');
        }

        const isNew = state.value.isNew;
        const assignment = JSON.parse(JSON.stringify(state.value.assignment));
        const assignmentResponse = JSON.parse(JSON.stringify(state.value.assignmentResponse));

        let localPhotoId = null;
        let imageQuestionId = null;

        if (isNew && state.value.formSchema.pages) {
            for (const page of state.value.formSchema.pages) {
                if (page.questions) {
                    for (const question of page.questions) {
                        if (question.type === 'image') {
                            const responseValue = assignmentResponse.responses[question.id];
                            if (responseValue && typeof responseValue === 'object' && responseValue.localId) {
                                localPhotoId = responseValue.localId;
                                imageQuestionId = question.id;
                                delete assignmentResponse.responses[question.id];
                                break;
                            }
                        }
                    }
                }
                if (localPhotoId) break;
            }
        }

        assignmentResponse.updated_at = new Date().toISOString();
        if (isNew) {
            assignmentResponse.status = 'SUBMITTED_LOCAL';
            assignment.status = 'SUBMITTED_LOCAL';
        } else {
            assignmentResponse.status = 'Submitted by PPL';
        }

        await activityDB.assignmentResponses.put(assignmentResponse);

        if (isNew && localPhotoId) {
            await syncEngine.queueForSync('createAssignmentWithPhoto', {
                assignment,
                assignmentResponse,
                localPhotoId: localPhotoId,
                imageQuestionId: imageQuestionId,
                activityId: assignment.kegiatan_statistik_id,
            });
        } else if (isNew) {
            await syncEngine.queueForSync('createAssignment', {
                assignment,
                assignmentResponse,
                activityId: assignment.kegiatan_statistik_id,
            });
        } else {
            await syncEngine.queueForSync('submitAssignment', {
                assignmentResponse,
                activityId: assignment.kegiatan_statistik_id,
            });
        }
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
        updateAssignmentLabel,
        touchField(questionId: string) {
            touchedFields.value.add(questionId);
        },
    };
});