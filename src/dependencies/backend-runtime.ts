import * as loggerMod from '../logger';

export interface IBackendRuntime<Parameters, Functions> {
	parameters: Parameters;
	functions: Functions;
	contextify(fnc: Function, staticContext?: any): IBackendRuntime<Parameters, Functions>;
	fncs(): Functions;
	params(): Parameters;
}

export const createBackendRuntime = <
	Parameters = any,
	Functions = any
>(parameters: Parameters): IBackendRuntime<Parameters, Functions> => {

	const runtime: {
		[key: string]: any,
	} = {
		parameters,
		functions: {},
	};

	runtime.contextify = (fnc: Function, staticContext?: any, options: {
		logErrors?: 'sync' | 'async'
	} = {}) => {
		staticContext = staticContext || {};
		let boundFnc = fnc.bind({...runtime, ...staticContext});
		const logger = staticContext.logger || loggerMod;
		if (options.logErrors === 'sync') {
			const rawFnc = boundFnc;
			boundFnc = (...args: Array<any>): any => {
				try {
					return rawFnc(...args);
				} catch (error) {
					logger.error({error, functionName: fnc.name}, 'Error on synchronous function');
					throw error;
				}
			}
		}
		else if (options.logErrors === 'async') {
			const rawFnc = boundFnc;
			boundFnc = async (...args: Array<any>): Promise<any> => {
				return rawFnc(...args).catch((error: any) => {
					logger.error({error, functionName: fnc.name}, 'Error on asynchronous function');
					return Promise.reject(error);
				});
			}
		}
		runtime.functions[fnc.name] = boundFnc;
		return runtime;
	};

	runtime.fncs = (): Functions => {
		return runtime.functions as Functions;
	};

	runtime.params = (): Parameters => {
		return runtime.parameters as Parameters;
	};

	return runtime as IBackendRuntime<Parameters, Functions>;

};
