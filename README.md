# js-compose

A dependency injection container library using a plain javascript object DSL for describing the dependencies and their configuration.


## Architecture

Most of the work of a js-compose container is done by extensions. Some terminology has been introduced to capture certain roles that extensions can play in the definition and creation of a service.

- Loader, or Module Loader
- Arg Resolver 
- Initialiser 
- Extra Handler

**Loaders** are responsible for retrieving the primitive that will be used as a base to initialise the service, most typically a `Function`, but potentially anything.

**Arg Resolvers** enhance the composition configuration with a DSL for resolving dependencies for a service.

**Initialisers** are responsible for creating the service from the base provided by Loaders, and the dependencies provided by Arg Resolvers.

**Extra Handlers** add extra functionality by hooking into lifecycle hooks of the service provided by the container. They facilitate the use of aspect oriented programming patterns.

* * * * *

### extension.loadModule(extensionApi)

The first extension where `canLoadModule(extensionApi) === true` will be used as the Loader for the service. Returns a `Promise` of the module.


### extension.resolveArg(argDefinition, extensionApi)

The service definition can optionally include an `args` property as an array. Each item will be passed to the first extension where `canResolveArg(argDefinition) === true`. Returns a `Promise` for the resolved arg.


### extension.beforeServiceInitialised(extraDefinition, extensionApi)

The service definition can optionally include an `extras` property as an array. Each item will be passed to the first extension where `canHandleExtra(extraDefinition, extensionApi) === true` for all lifecycle hooks.

The `beforeServiceInitialised` hook is called after loading the module and resolving args, but before initialising the service. It can optionally return a `Promise` if asynchronous work is necessary.


### extension.initialise(instanceCreatedCallback, loadedModule, ...resolvedArgs)

The first extension where `canInitialise(extensionApi) === true` will be used as the Initialiser for the service. Returns the complete service, as it will be returned from the container.

The `instanceCreatedCallback` should be called with any instance created by this service. If the Initialiser returns a factory capable of creating multiple instances, this can be called multiple times. If the Initialiser is not responsible for creating new instances, this callback can be skipped.


### extension.onServiceInstanceCreated(instance, extraDefinition, extensionApi)

The service definition can optionally include an `extras` property as an array. Each item will be passed to the first extension where `canHandleExtra(extraDefinition, extensionApi) === true` for all lifecycle hooks.

The `onServiceInstanceCreated` hook is called whenever an instance of a service is created. Any return value is ignored. It is useful for aspect-oriented programming patterns.


### extension.onServiceInitialised(initialisedService, extraDefinition, extensionApi)

The service definition can optionally include an `extras` property as an array. Each item will be passed to the first extension where `canHandleExtra(extraDefinition, extensionApi) === true` for all lifecycle hooks.

The `onServiceInitialised` hook is called after the service is initialised. It is useful for extending services which don't create instances, or where asynchronous work is needed, as it can optionally return a `Promise`.


### extension.onGetComplete(extraDefinition, extensionApi)

The service definition can optionally include an `extras` property as an array. Each item will be passed to the first extension where `canHandleExtra(extraDefinition, extensionApi) === true` for all lifecycle hooks.

The `onGetComplete` hook is called at the end of every call to `container.get()`, immediately before returning, even if the service already existed in the cache. Any return value is ignored.


## API

### new Container(extensions: Array<Extension>, config: Object)

A Container instance is constructed with all extensions and complete configuration. The order of extensions is relevant when deciding which to use for steps detailed in the Architecture section above.


### container.get(id: String): Promise<Any>

Returns a promise for the service with the given id.


### container.cache: Object

The cache for the container is a dictionary of service name to `Promise`. Unstable API.


### container.config: Object

The config given when constructing this container instance. Unstable API.


### Container.defaultInitialiser(extension: Extension): Extension

A static utility function exposed on the Container constructor. Using this will make an extension always return true for `canInitialise` checks, meaning there is no need to include the `init` param in the service definition, making it the "default". Only one extension should be added using this, and it should be at the bottom of the extensions list.
