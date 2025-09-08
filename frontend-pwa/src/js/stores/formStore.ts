import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { activityDB, Assignment, AssignmentResponse } from '@/js/services/offline/ActivityDB';
import { useAuthStore } from './authStore';
import { useDashboardStore } from './dashboardStore';
import { executeLogic } from '@/js/services/logicEngine';
import syncEngine from '@/js/services/sync/SyncEngine';

interface FormState {
    assignment: Assignment | null;
    assignmentResponse: AssignmentResponse | null;
    formSchema: any | null;
    status: 'loading' | 'ready' | 'error';
    error: string | null;
    isNew: boolean;
}

// Helper function to get a value from a nested object using a dot-notation path
function get(obj: any, path: string) {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result === undefined || result === null) return undefined;
        result = result[key];
    }
    return result;
}

// Helper function to set a value in a nested object using a dot-notation path
function set(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined || current[key] === null) {
            // If the next key is a number, create an array, otherwise an object
            current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
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
    const photoBlobCache = ref(new Map<string, string>()); // Cache for live blob URLs

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

        const rootResponses = state.value.assignmentResponse?.responses || {};

        const processQuestions = (questions: any[], currentPathPrefix = '') => {
            if (!questions) return;

            for (const question of questions) {
                const questionId = currentPathPrefix ? `${currentPathPrefix}.${question.id}` : question.id;
                const currentLevelResponses = currentPathPrefix ? get(rootResponses, currentPathPrefix) || {} : rootResponses;

                let isVisible = true;
                if (question.conditionalLogic?.showIf) {
                    try {
                        isVisible = executeLogic(question.conditionalLogic.showIf, currentLevelResponses);
                    } catch (e) {
                        console.error(`[CAPI-ERROR] Error executing showIf for ${questionId}:`, e);
                        isVisible = false;
                    }
                }

                if (!isVisible) continue;

                summary.totalVisibleCount++;

                if (question.type === 'roster') {
                    let rosterItems = currentLevelResponses[question.id] || [];
                    if (!Array.isArray(rosterItems)) {
                        console.warn(`[CAPI-WARN] Roster data for ${questionId} is not an array, treating as empty.`);
                        rosterItems = [];
                    }
                    rosterItems.forEach((_item: any, index: number) => {
                        const newPathPrefix = `${questionId}.${index}`;
                        processQuestions(question.questions, newPathPrefix);
                    });
                    continue;
                }

                const value = currentLevelResponses[question.id];
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
                            if (executeLogic(rules.requiredIf, currentLevelResponses)) {
                                checkAndPush(true, 'Wajib diisi berdasarkan jawaban lain');
                            } else {
                                summary.blanks.push({ questionId, label: question.label, message: 'Belum diisi' });
                            }
                        } catch (e) {
                            console.error(`[CAPI-ERROR] Error executing requiredIf for ${questionId}:`, e);
                        }
                    } else {
                        summary.blanks.push({ questionId, label: question.label, message: 'Belum diisi' });
                    }
                } else {
                    if (rules.minLength && rules.maxLength && rules.minLength === rules.maxLength) {
                        checkAndPush(String(value).length !== rules.minLength, `Harus ${rules.minLength} karakter`);
                    } else {
                        checkAndPush(!!rules.minLength && String(value).length < rules.minLength, `Minimal ${rules.minLength} karakter`);
                        checkAndPush(!!rules.maxLength && String(value).length > rules.maxLength, `Maksimal ${rules.maxLength} karakter`);
                    }
                    checkAndPush(!!rules.min && Number(value) < rules.min, `Nilai minimal ${rules.min}`);
                    checkAndPush(!!rules.max && Number(value) > rules.max, `Nilai maksimal ${rules.max}`);
                    if (rules.custom) {
                        try {
                            const customResult = executeLogic(rules.custom, currentLevelResponses);
                            if (customResult !== true) {
                                checkAndPush(true, customResult || 'Isian tidak valid');
                            }
                        } catch (e) {
                            console.error(`[CAPI-ERROR] Error executing custom validation for ${questionId}:`, e);
                        }
                    }
                }

                if (!isBlank && !hasIssue) {
                    summary.answeredCount++;
                }
            }
        };

        state.value.formSchema.pages.forEach((page: any) => {
            processQuestions(page.questions);
        });

        summary.errorCount = summary.errors.length;
        summary.warningCount = summary.warnings.length;
        summary.blankCount = summary.blanks.length;
        
        console.log('[CAPI-LOG] Validation summary recalculated:', JSON.parse(JSON.stringify(summary)));
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
        
        console.log(`[CAPI-LOG] Validation map recalculated. Touched fields count: ${touchedFields.value.size}, Resulting map size: ${map.size}`);
        return map;
    });

    async function _populatePhotoBlobCache(responses: any) {
        console.log('[CAPI-LOG] Populating photo blob cache...');
        const localIds: string[] = [];

        function findPhotoIds(data: any) {
            if (!data) return;
            if (Array.isArray(data)) {
                data.forEach(findPhotoIds);
            } else if (typeof data === 'object') {
                Object.values(data).forEach((value: any) => {
                    if (value && typeof value === 'object' && value.localId) {
                        localIds.push(value.localId);
                    } else if (typeof value === 'object' || Array.isArray(value)) {
                        findPhotoIds(value);
                    }
                });
            }
        }

        findPhotoIds(responses);

        if (localIds.length > 0) {
            console.log(`[CAPI-LOG] Found ${localIds.length} local photo IDs to cache.`);
            const photoBlobs = await activityDB.photoBlobs.where('id').anyOf(localIds).toArray();
            
            photoBlobCache.value.forEach(URL.revokeObjectURL);
            const newCache = new Map<string, string>();
            
            photoBlobs.forEach(photo => {
                const url = URL.createObjectURL(photo.blob);
                newCache.set(photo.id, url);
                console.log(`[CAPI-LOG] Created blob URL for localId ${photo.id}`);
            });
            photoBlobCache.value = newCache;
        } else {
             console.log('[CAPI-LOG] No local photo IDs found in responses.');
        }
    }
    
    function clearPhotoBlobCache() {
        console.log('[CAPI-LOG] Clearing photo blob cache and revoking URLs.');
        photoBlobCache.value.forEach(url => URL.revokeObjectURL(url));
        photoBlobCache.value.clear();
    }

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
    }

    async function loadAssignmentFromLocalDB(assignmentId: string) {
        console.log(`[CAPI-LOG] loadAssignmentFromLocalDB called for ID: ${assignmentId}`);
        state.value.status = 'loading';
        state.value.error = null;
        touchedFields.value.clear();
        clearPhotoBlobCache();

        try {
            const user = authStore.user;
            if (!user?.id) throw new Error('User not authenticated.');

            const assignment = await activityDB.assignments.get(assignmentId);
            if (!assignment) throw new Error(`Assignment with ID ${assignmentId} not found.`);

            const formSchemaRecord = await activityDB.formSchemas.get([assignment.kegiatan_statistik_id, user.id]);
            if (!formSchemaRecord) throw new Error(`Form schema for activity ${assignment.kegiatan_statistik_id} not found.`);

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
            console.log('[CAPI-LOG] Loaded responses from DB:', JSON.parse(JSON.stringify(response.responses)));
            
            await _populatePhotoBlobCache(response.responses);

            state.value.assignment = assignment;
            state.value.assignmentResponse = response;
            state.value.formSchema = formSchemaRecord.schema;
            state.value.isNew = false;
            state.value.status = 'ready';
            console.log('[CAPI-LOG] loadAssignmentFromLocalDB finished successfully.');

        } catch (error: any) {
            state.value.error = error.message;
            state.value.status = 'error';
            console.error('[CAPI-ERROR] Failed to load assignment from local DB:', error);
        }
    }

    function updateResponse(questionId: string, value: any) {
        if (state.value.assignmentResponse) {
            console.log(`[CAPI-LOG] updateResponse: Setting path '${questionId}' with value:`, JSON.parse(JSON.stringify(value)));
            set(state.value.assignmentResponse.responses, questionId, value);
        }
    }
    
    function addPhotoToCache(localId: string, file: File) {
        const url = URL.createObjectURL(file);
        photoBlobCache.value.set(localId, url);
        console.log(`[CAPI-LOG] Added new photo to cache. Local ID: ${localId}`);
    }

    function addRosterItem(rosterQuestionId: string) {
        if (state.value.assignmentResponse) {
            const responses = state.value.assignmentResponse.responses;
            let rosterArray = get(responses, rosterQuestionId);
            if (!Array.isArray(rosterArray)) {
                rosterArray = [];
                set(responses, rosterQuestionId, rosterArray);
            }
            rosterArray.push({});
            console.log(`[CAPI-LOG] Added item to roster: ${rosterQuestionId}. New size: ${rosterArray.length}`);
        }
    }

    function removeRosterItem(rosterQuestionId: string, index: number) {
        if (state.value.assignmentResponse) {
            const responses = state.value.assignmentResponse.responses;
            const rosterArray = get(responses, rosterQuestionId);
            if (Array.isArray(rosterArray)) {
                rosterArray.splice(index, 1);
                console.log(`[CAPI-LOG] Removed item from roster: ${rosterQuestionId} at index ${index}.`);
            }
        }
    }

    function touchField(questionId: string) {
        if (!touchedFields.value.has(questionId)) {
            console.log(`[CAPI-LOG] Touching field: ${questionId}`);
            touchedFields.value.add(questionId);
            // This reassignment is crucial to trigger Vue's reactivity for the computed `validationMap`
            touchedFields.value = new Set(touchedFields.value);
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
    
    // Actions for PML (Approve, Reject, Revert Approval)
    async function approveAssignment() {
        if (!state.value.assignmentResponse) throw new Error('No assignment response to approve.');
        console.log('[CAPI-LOG] Approving assignment...');
        state.value.assignmentResponse.status = 'Approved by PML';
        await saveResponsesToLocalDB();
        await syncEngine.queueForSync('updateAssignmentStatus', {
            assignmentId: state.value.assignmentResponse.assignment_id,
            status: 'Approved by PML',
            notes: null,
            activityId: state.value.assignment?.kegiatan_statistik_id,
        });
        console.log('[CAPI-LOG] Assignment queued for approval sync.');
    }

    async function rejectAssignment(notes: string) {
        if (!state.value.assignmentResponse) throw new Error('No assignment response to reject.');
        console.log(`[CAPI-LOG] Rejecting assignment with notes: "${notes}"`);
        state.value.assignmentResponse.status = 'Rejected by PML';
        state.value.assignmentResponse.notes = notes;
        await saveResponsesToLocalDB();
        await syncEngine.queueForSync('updateAssignmentStatus', {
            assignmentId: state.value.assignmentResponse.assignment_id,
            status: 'Rejected by PML',
            notes: notes,
            activityId: state.value.assignment?.kegiatan_statistik_id,
        });
        console.log('[CAPI-LOG] Assignment queued for rejection sync.');
    }
    
    async function revertApproval(notes: string | null) {
        if (!state.value.assignmentResponse) throw new Error('No assignment response to revert.');
        console.log(`[CAPI-LOG] Reverting approval with notes: "${notes}"`);
        state.value.assignmentResponse.status = 'Submitted by PPL'; // Reverts to the previous state
        state.value.assignmentResponse.notes = notes;
        await saveResponsesToLocalDB();
        await syncEngine.queueForSync('updateAssignmentStatus', {
            assignmentId: state.value.assignmentResponse.assignment_id,
            status: 'REVERT_APPROVAL', // Special action for the backend
            notes: notes,
            activityId: state.value.assignment?.kegiatan_statistik_id,
        });
        console.log('[CAPI-LOG] Assignment queued for approval reversion sync.');
    }


    return {
        state,
        pages,
        responses,
        photoBlobCache,
        validationSummary,
        validationMap,
        initializeNewAssignment,
        loadAssignmentFromLocalDB,
        updateResponse,
        addPhotoToCache,
        clearPhotoBlobCache,
        saveResponsesToLocalDB,
        submit,
        updateAssignmentLabel,
        addRosterItem,
        removeRosterItem,
        approveAssignment,
        rejectAssignment,
        revertApproval,
        touchField,
    };
});