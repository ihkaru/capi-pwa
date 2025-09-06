/**
 * A simple, safer subset of the form's state to pass to the logic engine
 * @param responses The complete object of form responses.
 */
const getContext = (responses: any) => {
  return {
    get: (key: string) => {
      return responses[key];
    },
    // In the future, we can add getRootValue, getParent, etc.
  };
};

/**
 * Executes a dynamic logic string (e.g., from a form schema) in a controlled environment.
 * @param logicString The string of JS code to execute (e.g., "return context.get('age') > 18").
 * @param responses The complete object of form responses to provide context.
 * @returns The result of the executed logic.
 */
export const executeLogic = (logicString: string, responses: any): any => {
  try {
    // Create a new function. The 'context' argument is the only variable
    // it will have access to from our scope.
    const func = new Function('context', logicString);
    const context = getContext(responses);
    return func(context);
  } catch (error) {
    console.error(`Error executing logic:`, error);
    console.error('Logic string was:', logicString);
    return false; // Default to a non-passing state on error
  }
};
