import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { activityDB, Assignment, AssignmentResponse } from '@/js/services/offline/ActivityDB';
import { useAuthStore } from './authStore';
import { executeLogic } from '@/js/services/logicEngine';
import { syncEngine } from '@/js/services/sync/SyncEngine';
import apiClient from '@/js/services/ApiClient';

interface FormState {
    assignment: Assignment | null;
    assignmentResponse: AssignmentResponse | null;
    formSchema: any | null;
    status: 'loading' | 'ready' | 'error';
    // IMPROVEMENT: Add an error property to store specific error messages for the UI.
    error: string | null;
}

export const useFormStore = defineStore('form', () => {
    const authStore = useAuthStore();

    const state = ref<FormState>({
        assignment: null,
        assignmentResponse: null,
        formSchema: null,
        status: 'loading',
        // IMPROVEMENT: Initialize the error state.
        error: null,
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

    async function loadAssignmentFromLocalDB(assignmentId: string) {
        console.log(`[formStore] Starting to load assignment ${assignmentId}`);
        state.value.status = 'loading';
        state.value.error = null;
        touchedFields.value.clear();
        try {
            const currentUser = authStore.user;
            if (!currentUser?.id) {
                throw new Error('User not authenticated. Cannot load assignment.');
            }
            console.log(`[formStore] Current user is: ${currentUser.email}, activeRole: ${authStore.activeRole}`);


            const assignment = await activityDB.assignments.get(assignmentId);
            if (!assignment) {
                throw new Error(`Assignment with ID ${assignmentId} not found in local DB.`);
            }
            state.value.assignment = assignment;
            console.log('[formStore] Found assignment:', assignment);

            const formSchemaRecord = await activityDB.formSchemas.get([assignment.kegiatan_statistik_id, currentUser.id]);
            if (!formSchemaRecord) {
                throw new Error(`Form schema for activity ${assignment.kegiatan_statistik_id} not found.`);
            }
            state.value.formSchema = formSchemaRecord.schema;
            console.log('[formStore] Found form schema version:', formSchemaRecord.schema?.form_version);

            let response = await activityDB.assignmentResponses.get(assignmentId);
            console.log(`[formStore] Found existing response in DB for ${assignmentId}:`, response ? JSON.parse(JSON.stringify(response)) : 'null');

            if (!response) {
                // If no response exists, the behavior depends on the user's role.
                if (authStore.activeRole === 'PML') {
                    // A PML should NEVER create a response. They only review existing ones.
                    // If it's not found, it's a data sync error.
                    console.error(`[formStore] PML ${currentUser.email} tried to open an assignment (${assignmentId}) with no existing response. This should not happen.`);
                    throw new Error(`Data wawancara untuk penugasan ini belum tersedia di perangkat Anda. Mohon lakukan sinkronisasi terlebih dahulu.`);
                } else {
                    // For a PPL, create a new response if it's their first time opening it.
                    console.log(`[formStore] No response found for PPL. Creating a new one for assignment ${assignmentId}.`);
                    const newResponse: AssignmentResponse = {
                        assignment_id: assignmentId,
                        user_id: currentUser.id,
                        status: 'Opened',
                        version: 1,
                        form_version_used: state.value.formSchema?.form_version || 1,
                        responses: {},
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    await activityDB.assignmentResponses.put(newResponse);
                    response = newResponse;
                    console.log(`[formStore] New response created and saved.`);
                }
            }
            // FIX: The 'responses' property from the backend might be a JSON string. Parse it.
            if (response && typeof response.responses === 'string') {
                try {
                    console.log('[formStore] Responses field is a string. Attempting to parse...');
                    response.responses = JSON.parse(response.responses);
                    console.log('[formStore] Responses field parsed successfully.');
                } catch (e) {
                    console.error('[formStore] Failed to parse responses JSON string:', e);
                    // Handle error, maybe by setting responses to an empty object
                    response.responses = {};
                }
            }

            state.value.assignmentResponse = response;
            console.log(`[formStore] Final assignmentResponse state:`, JSON.parse(JSON.stringify(response)));

            state.value.status = 'ready';
            console.log(`[formStore] Store is ready.`);

        } catch (error: any) {
            console.error('[formStore] Failed to load assignment from local DB:', error);
            state.value.error = error.message || 'An unknown error occurred while loading the assignment.';
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
                        current[key] = isNaN(parseInt(keys[index+1])) ? {} : [];
                    }
                    current = current[key];
                }
            });
        }
    }

    async function saveResponsesToLocalDB() {
        if (state.value.assignmentResponse) {
            state.value.assignmentResponse.updated_at = new Date().toISOString();
            // Use JSON methods to ensure we're saving a plain object, not a Vue proxy
            const plainResponseObject = JSON.parse(JSON.stringify(state.value.assignmentResponse));
            await activityDB.assignmentResponses.put(plainResponseObject);
        }
    }

    async function submitAssignment() {
        if (!state.value.assignment || !state.value.assignmentResponse || !state.value.formSchema) {
            throw new Error('Cannot submit, essential data is not loaded.');
        }

        const assignmentId = state.value.assignment.id;
        const responsesCopy = JSON.parse(JSON.stringify(state.value.assignmentResponse.responses));

        const findQuestionsByType = (type: string) => {
            const questionsFound: any[] = [];
            const traverse = (questions: any[]) => {
                if (!questions) return;
                for (const q of questions) {
                    if (q.type === type) {
                        questionsFound.push(q);
                    }
                    if (q.type === 'roster' && q.questions) {
                        traverse(q.questions);
                    }
                }
            };
            // Ensure pages and questions exist before trying to flatMap
            state.value.formSchema.pages?.forEach((p: any) => traverse(p.questions));
            return questionsFound;
        };

        const imageQuestions = findQuestionsByType('image');

        for (const imageQuestion of imageQuestions) {
            const imageId = imageQuestion.id;
            const base64Data = responsesCopy[imageId];

            if (base64Data && base64Data.startsWith('data:image')) {
                try {
                    const imageFile = await dataURLtoFile(base64Data, `${imageId}.jpg`);
                    const uploadResponse = await apiClient.uploadPhoto(assignmentId, imageFile);
                    responsesCopy[imageId] = uploadResponse.fileId;
                } catch (error) {
                    console.error(`Failed to upload photo for question ${imageId}:`, error);
                    // IMPROVEMENT: Provide a more user-friendly error message.
                    throw new Error(`Gagal mengunggah foto untuk pertanyaan "${imageQuestion.label}". Silakan coba lagi.`);
                }
            }
        }

        state.value.assignmentResponse.responses = responsesCopy;
        state.value.assignmentResponse.status = 'Submitted by PPL';
        state.value.assignmentResponse.updated_at = new Date().toISOString();

        await saveResponsesToLocalDB();

        const assignmentResponseToSend = JSON.parse(JSON.stringify(state.value.assignmentResponse));
        
        // FIX: Add detailed logging and a try-catch block to diagnose the stringification issue.
        try {
            console.log('[formStore] Type of responses BEFORE stringify:', typeof assignmentResponseToSend.responses);
            console.log('[formStore] Value of responses BEFORE stringify:', JSON.stringify(assignmentResponseToSend.responses, null, 2)); // Pretty print for readability
            
            assignmentResponseToSend.responses = JSON.stringify(assignmentResponseToSend.responses);
            
            console.log('[formStore] Type of responses AFTER stringify:', typeof assignmentResponseToSend.responses);
            console.log('[formStore] Value of responses AFTER stringify:', assignmentResponseToSend.responses);
        } catch(e) {
            console.error('[formStore] CRITICAL: Failed to stringify responses object.', e);
            console.error('[formStore] Object that failed to stringify:', assignmentResponseToSend.responses);
            throw new Error('Gagal memproses data formulir untuk pengiriman.');
        }


        const payload = {
            activityId: state.value.assignment.kegiatan_statistik_id,
            assignmentResponse: assignmentResponseToSend,
        };

        await syncEngine.queueForSync('submitAssignment', payload);
    }

    async function approveAssignment() {
        if (!state.value.assignment || !state.value.assignmentResponse) {
            throw new Error('Cannot approve, essential data is not loaded.');
        }
        if (authStore.activeRole !== 'PML') {
            throw new Error('Only PML can approve an assignment.');
        }

        state.value.assignmentResponse.status = 'Approved by PML';
        await saveResponsesToLocalDB();

        const payload = {
            assignmentId: state.value.assignment.id,
            status: 'Approved by PML',
        };

        await syncEngine.queueForSync('approveAssignment', payload);
    }

    async function rejectAssignment(notes: string) {
        if (!state.value.assignment || !state.value.assignmentResponse) {
            throw new Error('Cannot reject, essential data is not loaded.');
        }
        if (authStore.activeRole !== 'PML') {
            throw new Error('Only PML can reject an assignment.');
        }
        // Notes are optional for reject

        state.value.assignmentResponse.status = 'Rejected by PML';
        // IMPROVEMENT: Store rejection notes in the assignmentResponse if schema allows
        await saveResponsesToLocalDB();

        const payload = {
            assignmentId: state.value.assignment.id,
            status: 'Rejected by PML',
            notes: notes,
        };

        await syncEngine.queueForSync('rejectAssignment', payload);
    }

    async function revertApproval(notes: string) {
        if (!state.value.assignment || !state.value.assignmentResponse) {
            throw new Error('Cannot revert approval, essential data is not loaded.');
        }
        if (authStore.activeRole !== 'PML') {
            throw new Error('Only PML can revert an approval.');
        }
        // Notes are optional for revert, but good practice to encourage

        state.value.assignmentResponse.status = 'Submitted by PPL';
        // Optionally, store notes for revert action
        if (notes) {
            state.value.assignmentResponse.notes = notes; // Assuming 'notes' field exists
        }
        await saveResponsesToLocalDB();

        const payload = {
            assignmentId: state.value.assignment.id,
            status: 'Submitted by PPL',
            notes: notes,
        };

        await syncEngine.queueForSync('revertApproval', payload);
    }

    function addRosterItem(rosterQuestionId: string) {
        if (state.value.assignmentResponse) {
            if (!state.value.assignmentResponse.responses[rosterQuestionId]) {
                state.value.assignmentResponse.responses[rosterQuestionId] = [];
            }
            state.value.assignmentResponse.responses[rosterQuestionId].push({});
        }
    }

    function removeRosterItem(rosterQuestionId: string, index: number) {
        if (state.value.assignmentResponse?.responses[rosterQuestionId]) {
            state.value.assignmentResponse.responses[rosterQuestionId].splice(index, 1);
        }
    }

    function touchField(questionId: string) {
        // IMPROVEMENT: Directly adding to the Set is sufficient for Vue's reactivity.
        if (!touchedFields.value.has(questionId)) {
            touchedFields.value.add(questionId);
        }
    }

    return {
        state,
        pages,
        responses,
        validationSummary,
        validationMap,
        loadAssignmentFromLocalDB,
        updateResponse,
        saveResponsesToLocalDB,
        addRosterItem,
        removeRosterItem,
        touchField,
        submitAssignment,
        approveAssignment,
        rejectAssignment,
        revertApproval,
    };
});

/**
 * FIX: Refactored function to be fully async and return a Promise<File> for type safety.
 * Converts a data URL string to a File object. Handles SVG to PNG conversion.
 * @param dataurl The data URL to convert.
 * @param filename The desired filename for the output File.
 * @returns A Promise that resolves with the created File object.
 */
async function dataURLtoFile(dataurl: string, filename: string): Promise<File> {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
        throw new Error('Invalid data URL');
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Could not parse MIME type from data URL');
    }
    let mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    if (mime === 'image/svg+xml') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for SVG conversion'));
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(new File([blob], filename.replace(/\.svg$/i, '.png'), { type: 'image/png' }));
                    } else {
                        reject(new Error('Canvas toBlob failed during SVG conversion'));
                    }
                }, 'image/png');
            };
            img.onerror = (err) => reject(new Error(`Image loading failed for SVG conversion: ${err}`));
            img.src = dataurl;
        });
    }

    return new File([u8arr], filename, { type: mime });
}