Anemic-model approach
===

Entities do not contain business logic, they focus on storing valid data.

Every business logic is in domain services. 

Some of the files contain additional notes.

What are these folders?
===

The main reason to have this separation is to identify business/domain boundaries and have *a modular monolith approach* where you have the option to separate actions into simple services through use cases and delegate certain functionalities to smaller services or other layers.

# Folders

## customer-workflow

Represents a domain boundary. It contains multiple entites, actions and so on. 

### use-cases

Use-cases are business driven use cases that could be further grouped around an aggregate root (eg use-cases / issue / register|remove|.. ). Aggregate root in this context is an entity an all cohesive concepts in the domain. Do not create classes with this concept and name following this guid, as even the name "entity" would be invalid, therefor its cohesive group would breach its definition and further violate the principles, creating a model-spagetti where dummy models would refer to one other, constantly invalidating and validating each other through setters.

As our model layer is thin and it does not contain business logic, we have the urge to create higher level, domain driven services that are combined together based on a business workflow. This is the "use-case". Naming it feature would create confusion as its also a tech jargon in testing, otherwise thats still acceptable from business perspective.

### domain 

This is where the domain services and models are. Anything that interacts with the domain has to be noted here.

Services that are close to domain but not entirely connected to a use-case or an entity (like generic model validation) could also be put here. 

Domain specific interfaces are also stored here, but their implementation are not. Repository as an interface that specifies domain interactions on an entity, but their implementation sits on infrastructure layer. Business does not care about such implementation details and this separation allows us to safely maintain them without breaching / breaking the domain and clearly noting it for other developers.

Separating and building errors through inheritence on top of layer-specific ones help us to capture them on meaningful places and re-throw ones based on audience. 
Domain/business errors are usually safe to display to the user (after permission checks and sanitization). 
Infrastructure ones are usually unsafe but could be converted to a displayable error (database unreachable is an internal server error whereas duplicate key entry indicates bad request, hitting unique constraint error could also be both). 
Application specific ones are usually connected to misconfiguration.

### application

Code that is traditionally in controllers (MVC) or actions (ADR) are put here or services that are helping in pulling infrastructure dependencies closer to domain. 
API contract/implementation, networking access to application, middlewares could be put here.

### infrastructure

Everything that is focusing on data leaving our application is put here. Their interfaces is usually put to other layers.

The ide behind the infra layer separation is to handle problems without hurting any other layer. Replacing a database engine or version should not change our domain layer, updating a package that has breaking changes should not modify our business, removing a framework should not hurt our business rules and workflow. 

# What are the problems?

Identifying different layers is not trivial and there are no proper guidelines other than the ones I already presented.

Making sure services are safe and defensive is difficult as it any time could modify properties of an entity, even when it relies on getters and setters, making them invalid.

Such seperation will slowly become bourden as a "common" directory will emerge to store functionalities across use-cases, such as databa drivers or contract parsers (json schema validator). Having such directory is not a problem, but separating modules/packages in it is necessary as we have to rely on a solid contract when using them (eg build facades) to avoid coupling between common libraries and leaking them to use-cases.

Placing  higher level services that are combining multiple services are difficult.
Imagine having an email service that needs an email, a templating service and an email template, a user repository with user preferences. 
The template repository could fetch email template from database, the template service could modify the email and update the contents and subjects based on arguments and the user repository is needed to grab emails address for users and their preferences are necessary to check whether or not they enabled certain emails-channels, eg they dont want to receive marketing emails.
In this setup, email itself, seems like an entity but it needs templated contents, valid address and subject. Therefor the original user id and template id or template reason and such are just part of a contract (request model) and our entity is the templated email.
Identifying the entity is crucial as otherwise the developers would not know which model has gone through a service and "is valid" and "remains valid". 

This part in other architectures are always done via control-flow checks that are necessary, like always validating a model and throwing error or always checking if email.status is templated and so on. It is necessary when designing modular systems that has to deal with customer-facing IO. In our case, make sure you separate customer facing APIs and internal ones and try to be type safe and use immutable, valid models across board. 

# Alternative folder structure

This layer based separation only makes sense if the target structure is modular monolithic.
When we are building smaller packages around a topic or operation and want to deploy microservices, it barely makes sense. These would effectively only contain few models and services. 
Having a customer modul that contains customer entity and entry point for crud operations might make sense. 
In these terms, separating a contract is important. These packages should rely on a single entry point, otherwise they would leak information that breaks the contract and could create invisible hardcoded dependency. 
None of the other pckages/modules/services/etc should rely on anything else, other than the main API the packages are exporting.

This essentially leads to service oriented architecture (with microservices) where a service could be remote, otherwise the previous separation makes no sense. This creates overhead as each of the services have to rely on contract and validating it as they could come from external sources (eg API layer).

With a proper http routing library or framework, it is still possible to chunk up monolithic modular applications into smaller http apis without thinking about "microservices". A use-case is essentially an action on an entity/aggregate root that could be deployed individually.

# Optimalization, standardization

The only meaningful optimatlization without focusing on infrastructure, we could do is to remove repititon and add generic solutions that could be improved re-used based.

## Generic repository

The first topic that usually comes in is to have a generic repository:
```typescript
interface Repository<P extends object> {
    getById<F extends keyof P>(id: F): Promise<P>;   
}
// or
interface Repository<T extends new (.. args: unknown[]): T> {}...
// or 
interface Repository<T extends Entity> {}
// and so on
```

The problem and criticism repositories usually receive is that they grow big due to how they connect entities and the dependency between a business service and the repository is not clear (eg its impossible to tell which repository method is needed for a use-case, service, etc), therefore Interface Segregation Principle should be applied.

Creating a generic repository or relying on it just grows this further as every repository would contain the same generic operations that might not be needed but as they are present, they have to be working properly and have to be maintained. 

Another often-heard point is that a fat repository is difficult to mock.
You dont mock a repository. It should be easy to create an in-memory fake and carry it on and it is advised to test your code against a real database through the real repository as well.

## Extracting validators

As the need to validate objects grow among with the object count, the urge to create a generic validation appears. 

Validation is part of the object-lifecycle. We should try to design our models to stay valid after creation. 

Validation libraries should be encapsulated and should be hidden behind an interface. In this way, replacing them would be easier. 

Relying on decorators that are modifying properties and override setters is fine as well in this anemic-model focused line, we can manually create setters and even have a validator dependency behind them thats exposed through an interface. 

It acts differently on application layer where contract validation is done with DTOs through factories and it should throw error before reaching the domain.
Proper abstraction is necesarry, but it is not connected to the currently presented architecture.

# QA

## NO TEST?

This is a dummy code for presentation purposes.

## Use case and action are the same?

They look the same but they represent different things.
The action connets the layers and pulls in implementations whereas the use-case uses blueprints and focuses on business.

### But my framework does this through DI and middleware-chain

If your action relies on validated and strict models and its dependencies are limited and your domain does not know about implementation, it could be fine.

It is often not the case as actions usually contain responders that leak implementation detail to business, breaching layers and linking domain to infrastructure implementation, like sending http status codes and returning json. Both are part of an api contract, not the domain contract.






