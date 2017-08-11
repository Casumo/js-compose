import { _, Promise } from '../globals';
import ExtensionApi from './ExtensionApi';
import { ServiceError } from './errors';

export default function Container (extensions, config) {
    return {
        moduleLoaders: _.filter(extensions, 'canLoadModule'),
        argResolvers: _.filter(extensions, _.property('canResolveArg')),
        initialisers: _.filter(extensions, _.property('canInitialise')),
        extraHandlers: _.filter(extensions, _.property('canHandleExtra')),
        config: config,
        cache: {},
        chain: [],
        get,
        lint
    }
}

/**
 * @param {String} serviceId
 *
 * @return {Promise}
 */
function get (serviceId) {

    const self = this;
    const serviceDefinition = self.config.services[serviceId];
    const extensionApi = new ExtensionApi(self, serviceId, serviceDefinition);
    let extraHandlers;

    const output = self.cache[serviceId] || new Promise((resolve) => {

        if (!serviceDefinition) {
            throw new Error(`Missing service definition for ${ serviceId }`);
        }

        if (countOccurrencesInArray(self.chain, serviceId) > 1) {
            throw new Error(`Circular dependency detected: ${ self.chain.concat(serviceId).join(', ')}` );
        }

        extraHandlers = getExtraHandlers(serviceDefinition.extras, self.extraHandlers, extensionApi);

        const moduleLoader = getModuleLoader(self.moduleLoaders, extensionApi);

        if (!moduleLoader) {
            throw new Error('No module loader');
        }

        const initialiser = getInitialiser(self.initialisers, extensionApi);

        if (!initialiser) {
            throw new Error('No initialiser');
        }

        const args = serviceDefinition.args || [];
        const serviceAndArgPromises = getServiceAndArgPromises(args, moduleLoader, extensionApi);

        self.cache[serviceId] = Promise
            .all(serviceAndArgPromises)
            .then(serviceAndArgs => runBeforeInitialisedCallbacks(serviceAndArgs, extraHandlers, serviceDefinition.extras, extensionApi))
            .then(serviceAndArgs => initialiseService(serviceAndArgs, initialiser, extraHandlers, serviceDefinition.extras, extensionApi))
            .then(instance => runOnInitialisedCallbacks(instance, extraHandlers, serviceDefinition.extras, extensionApi));

        resolve(self.cache[serviceId]);

    }).catch(error => {
        throw new ServiceError(serviceId, error);
    });

    _.each(extraHandlers, (handler, extraIndex) => {
        if (handler.onGetComplete) {
            handler.onGetComplete(serviceDefinition.extras[extraIndex], extensionApi);
        }
    });

    return output;
}

/**
 * @return {Promise<Array<String>>} - A list of lint errors
 */
function lint () {

    return Promise.all(_.map(this.config.services, (serviceDefinition, serviceId) => {

        const errors = [];
        const extensionApi = new ExtensionApi(this, serviceId, serviceDefinition);

        const moduleLoader = getModuleLoader(this.moduleLoaders, extensionApi);

        if (!moduleLoader) {
            errors.push(`Missing module loader for ${serviceId}`);
        } else if (moduleLoader.lintLoader) {
            errors.push(moduleLoader.lintLoader(extensionApi));
        }

        const initialiser = _.find(this.initialisers, (initialiser) => {
            return initialiser.canInitialise(extensionApi);
        });

        if (!initialiser) {
            errors.push(`Missing initialiser for ${serviceId}`);
        }

        _.each(serviceDefinition.args, (argDefinition, i) => {

            try {
                const argResolver = extensionApi.getArgResolver(argDefinition);

                if (argResolver.lintArg) {
                    errors.push(argResolver.lintArg(argDefinition, extensionApi));
                }
            } catch (e) {
                errors.push(`Missing argResolver at [${i}] for ${serviceId}`);
            }

        });

        _.each(serviceDefinition.extras, (extraDefinition, i) => {

            const extraHandler = _.find(this.extraHandlers, (extraHandler) => {
                return extraHandler.canHandleExtra(extraDefinition, extensionApi);
            });

            if (!extraHandler) {
                errors.push(`Missing extraHandler at [${i}] for ${serviceId}`);
            } else if (extraHandler.lintExtra) {
                errors.push(extraHandler.lintExtra(extraDefinition, extensionApi));
            }

        });

        return Promise.all(errors);

    })).then((results) => _.compact(_.flattenDeep(results)));

}

/**
 * @static
 *
 * @param {Initialiser} initialiser
 *
 * @return {Initialiser}
 */
export function defaultInitialiser (initialiser) {

    return _.extend({}, initialiser, {
        canInitialise (extensionApi) {

            if (!extensionApi.serviceDefinition.init) {
                return true;
            }

            return initialiser.canInitialise(extensionApi);
        }
    });
}

function countOccurrencesInArray (array, item) {
    return array
        .filter(arrayItem => _.isEqual(arrayItem, item))
        .length;
}

function getExtraHandlers (extraDefinitions = [], extraHandlers, extensionApi) {
    return _.map(extraDefinitions, extraDefinition => {
        const handler = getHandlersForExtraDefinition(extraDefinition, extraHandlers, extensionApi);

        if (!handler) {
            throw new Error(`No extra handler for ${extraDefinition}`);
        }

        return handler;
    });
}

function getHandlersForExtraDefinition (extraDefinition, extraHandlers, extensionApi) {
    return _.find(extraHandlers, extraHandler => {
        return extraHandler.canHandleExtra(extraDefinition, extensionApi);
    });
}

function getModuleLoader (moduleLoaders, extensionApi) {
    return _.find(moduleLoaders, moduleLoader => {
        return moduleLoader.canLoadModule(extensionApi);
    });
}

function getInitialiser (initialisers, extensionApi) {
    return _.find(initialisers, initialiser => {
        return initialiser.canInitialise(extensionApi);
    });
}

function getServiceAndArgPromises (args, moduleLoader, extensionApi) {
    const modulePromise = moduleLoader.loadModule(extensionApi);
    const promises = extensionApi.resolveArgs(args);

    promises.unshift(modulePromise);

    return promises;
}

function runBeforeInitialisedCallbacks (contents, extraHandlers, extraDefinitions, extensionApi) {
    const promises = _.map(extraHandlers, (handler, index) => {
        const callback = handler.beforeServiceInitialised;

        if (callback) {
            return callback(
                extraDefinitions[index],
                extensionApi
            );
        }
    });

    return Promise
        .all(promises)
        .then(() => contents);
}

function initialiseService (serviceAndArgs, initialiser, extraHandlers, extraDefinitions, extensionApi) {
    return initialiser.initialise(
        // eslint-disable-next-line prefer-arrow-callback
        function instanceCreatedCallback (instance) {

            extraHandlers.forEach((handler, index) => {

                if (handler.onServiceInstanceCreated) {

                    handler.onServiceInstanceCreated(
                        instance,
                        extraDefinitions[index],
                        extensionApi
                    );
                }

            });

        },
        ...serviceAndArgs
    );
}

function runOnInitialisedCallbacks (instance, extraHandlers, extraDefinitions, extensionApi) {
    const promises = _.map(extraHandlers, (handler, extraIndex) => {
        const callback = handler.onServiceInitialised;

        if (callback) {
            return callback(
                instance,
                extraDefinitions[extraIndex],
                extensionApi
            );
        }
    });

    return Promise
        .all(promises)
        .then(() => instance);
}
