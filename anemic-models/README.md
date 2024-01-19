Anemic model approach
===

Hexagonal architecture with anemic models.

Entities do not contain business logic, they focus on storing valid data.

Every business logic is in domain services. 

API contracts and traditional controllers and actions are in application folder.

Infrastructure holds implementation details about interfaces focusing in domain data leaving the application.

Some of the files contain additional notes.

What are these folders?
===

The main reason to have this separation is to identify business/domain boundaries and have *a modular monolith approach* where you have the option to separate actions into simple services through use cases and delegate certain functionalities to smaller services or other layers.

# Folders

## customer-workflow

Represents a domain boundary.

### use-cases

Use-cases are business driven features that could be further grouped around an aggregate root. Aggregate root is an entity and all its cohesive concepts in the domain.
Do not create aggregate root-like classes within this anemic model approach, as even the name `entity` is invalid in this context, therefor its cohesive group would breach its definition and further violate its principles, creating a model-spagetti where models without business logic (other than validation) would refer to one other, constantly invalidating and validating each other through setters.

As our model layer is thin and it does not contain business logic, we have the urge to create higher level, domain driven services that are combined together based on a business workflow. This is the "use-case". Naming it feature would create confusion as its also a tech jargon in testing, otherwise thats still acceptable from business perspective.

### domain 

This is where the domain services and models are. Anything that interacts with the domain has to be noted here.

Services that are close to domain but not entirely connected to a use-case or an entity (like generic model validation) could also be put here. 

Domain specific interfaces are also stored here, but their implementation are not. Repository is an interface that specifies interactions on an entity, but its implementation sits on infrastructure layer. Business does not care about such implementation details and this separation allows us to safely maintain them without breaching / breaking the domain and clearly noting it for other developers.

#### error

Separating and building errors through inheritence on top of layer-specific class help us to capture them on meaningful places and re-throw based on audience. 
Domain/business errors are usually safe to display to the user (after permission checks and sanitization). 
Infrastructure ones are usually unsafe but could be converted to a displayable error: database unreachable is an internal server error whereas duplicate key entry indicates bad request, hitting unique constraint error could also be both. 
Application specific ones are usually connected to misconfiguration or API validation.

### application

Code that is traditionally in controllers (MVC) or actions (ADR) are put here or services that are helping in pulling infrastructure dependencies closer to domain. 
API contract/implementation, networking access to application, middlewares could be put here.

### infrastructure

Everything that is focusing on domain data leaving our application is put here. Their interfaces are usually put to domain layer.

The ide behind the infra layer separation is to handle problems without hurting any other layer. Replacing a database engine or version should not change our domain layer, updating a package that has breaking changes should not modify our business, removing a framework should not hurt our business rules and workflow. 

# What are the problems?

## Layers, overall structure

Identifying different layers is not trivial and there are no guidelines other than the "leaky" ones already present here.

The current seperation will slowly become burden as a "common" directory will emerge to store functionalities across use-cases, such as database drivers or contract parsers (json schema validator). Having such directory is not a problem, but treating modules/packages in it is necessary. In that way, relying on solid contract and using one entry point is required (eg use facade pattern) to avoid coupling between common packages and leaking parts to use-cases, creating invisible hardcoded dependencies or circular ones.

Placing higher level services that are combining multiple services is difficult.
Imagine having an email service that needs an email, a templating service and an email template, a user repository with user preferences. 
The template repository could fetch email template from database, the template service could modify the email and update the contents based on variable arguments. The user repository is needed to grab emails address for users. Their preferences are necessary to check whether or not they enabled certain emails-channels, eg they dont want to receive marketing emails.
In this setup, email itself, seems like an entity but it needs templated contents, valid address and subject. Therefor the original user id and template are just part of a contract (request api model) and our entity is the templated email.
Identifying the entity is crucial as otherwise the developers would not know which model has gone through a service and "is valid" and "remains valid" after creation. 

This part in other approaches are always done via control-flow checks that are necessary, like always validating a model and throwing error or always checking at least a property on a model. It is necessary when designing modular systems that has to deal with customer-facing IO. In our case, making sure to separate customer facing APIs and internal ones are key to have valid models across the sytem to eliminiate constaintly validating models. It is best to use immutable, typesafe models and close them as much as necessary around creation topic (eg named constructors, factories).

## Unsafe entities

Making sure services are safe and defensive is difficult as any of them could modify properties of an entity, even when using getters and setters, potentially making them invalid. Specificly true when relying on a combination of setters or order of methods being called.

### Example

```typescript
class User {
    private readonly password: string;
    private readonly hashAlgo: string;
    // ...
}
```

In this example changing password and hashing algo can be done separately. While changing the password can be done individually without updating the algo, changes in the algo requires re-hashing the password. 
The developer would create a method that combines both of these together, like `setPassword(newPassword, hashingAlgo)` and removes setters for individual property changes. This would mean that hydrating this entity has to be done through constructor, as otherwise developers have to have implementation knowledge and build a mental model of possible order of function calls.

To tighten the relations between the methods, add `lastModifiedAt` and `lastModifiedBy`. Individually changing any of it makes no sense, unless something has been changed on the entity. Which means any method that modifies the state of the entity would have to call `lastModifiedAt` and `lastModifiedBy`. We also could extract the necessity of calling any of it by letting another layer set these up, like `lastModifiedAt` could be done in the database and `lastModifiedBy` could be done as a separate call before the original state change goes through.

This also creates confusion as the developer has to build a mental model about what is changed on what layer and different services has to know what other services are modifying the entity. `lastModifiedBy` is already changed by `ServiceX` therefor no other service should mofiy this property and all of them has to make sure they use `ServiceX`.

### Managers

Following up the previous trend, we can set up certain cases where the order of method calls are logically bound. We can choose to approach a solution from `services` and treat every `entity` as dummy data structures and do everything inside `services`. It means that we can have setters, getters on an `entity` to validate the given arguments but calling these should be limited to `services`. 
In this case, order of calling `services` has to be known for the developers and they will end up creating managers that are dictating the process of calling services.

```typescript

type Purpose = "Shipping" | "Marketing mails" | "Invoice";

class UserAddressManager {
    public function addAddress(user: User, address: Address);
    public function setActiveAddress(user: User, address: Address, purpose: Purpose);
    public function removeAddress(user: User, address: Address);
}
```

In the  example above, the user has multiple addresses and can select an active one for a specific purpose.
Setting an active address could potentially add the address to the user by calling `addAddress`.
Remove could simply remove the address or throw an error when it is set up as active address for one of the purposes.
None of these are visible or known.

Developers could choose an easy way in the form of boolean parameter to signal a desired working method, leading to `removeAddress(user: User, address: Address, removeWhenActive: boolean);` 
Each of these requires checking if a given address is already attached to the user: `hasAddress(user: User, address: Address)`. 

When we want to use the manager and set active address for the user, we have to know if it checks for already existing address or adds it or throws an error. As we do not want to add more flags, we will rely on descriptions. 
It further increases the maintenance cost as it still relies on the developer's knowledge about the codebase.

What happens when we want to use these addresses?

```typescript
class InvoiceManager {
    public function createInvoice(user: User, Order: Order): Invoice;
    public function initiateSend(invoice: Invoice): SentInvoice;
}
```

In this simplified example, `InvoiceManager` needs to get the active address of the user, create an invoice and make sure it is sent to it.
Which part handles getting the user's address for this specific purpose? What happens when the user does not have an address for that, should it return a default? Which class handles this flow? 

We might end up in a point where we would like to encapsulate everything under a bigger manager that handles the process of getting invoice address for the user, setting a default one up, creating the invoice, sending it to a 3rd party to request printing or sending it via email and then making sure the user received it or marking the address as invalid and add the operational costs to an internal payment system.

All of these examples are pointing towards a valid criticism: an entity (or any object) without behaviour is just a data structure that requires unsafe methods to be operated on, increasing the mental load and maintenance cost in the long term as developers have to map business requirements to services and to group of services where implementation detail knowledge is crucial.

# Alternative folder structure

This layer based separation only makes sense if the target structure is modular monolithic.

When building smaller packages around a topic or operation to deploy microservices, there are better approaches. These would effectively only contain few models and services. 
Having a customer module that contains customer entity and entry point for crud operations might be a better choice due to its simplicity and avoiding noise. 
In these terms, separating a contract is important. These packages should rely on a single entry point. 
None of the other pckages/modules/services/etc should rely on anything else, other than the main API the packages are exporting.

This essentially leads to service oriented architecture (possibly with microservices) where a service could be remote. This creates overhead as each of the services have to rely on contracts and has to validate inputs, create internal models as they could come from external sources. These contract inputs are called "DTO"-s.

With a proper http routing library or framework, even without previous changes it is still possible to chunk up monolithic modular applications into smaller http apis without thinking about "microservices". A use-case is essentially an action on an entity/aggregate root that could be deployed individually. When following ADR (as action-domain-responder) and separating modules in a way they become independent on the full route (user module registers to /user but their endpoints are unaware of prefix, they listen to /:id and such), a few lines of code should enable individually shipping route handlers.
The previously missing, yet important part is handling dependencies properly by respecting modular entry points.

# Optimalization, standardization

The only meaningful optimatlization without focusing on infrastructure implementation details is to remove repititon and add generic solutions that could be re-used.

## Generic repository

The first topic that usually comes in is to build a generic repository:
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

The problem and criticism repositories usually receive is that they grow big due to how they connect entities and handle relationships. The dependency between a business service and the repository is not clear, its impossible to tell which repository method is needed for a use-case, service without knowing implementation details. 
By the book, Interface Segregation Principle should be applied.

Creating a generic repository or relying on it just grows this further as every repository would contain the same generic operations that might not be needed but as they are present, they have to be maintained. 

Another often-heard point is that a fat repository is difficult to mock.
You dont mock a repository. It should be easy to create an in-memory fake and carry it on and it is advised to test your code against a real database through the real repository as well.

Repository should be focusing on basic "array-like" operations. When it grows meaningfully bigger, its usually a sign to separate the operations into smaller domain services or choose another approach when dealing with persistence. 
Like entity managers with unit of work or creating different repositories.

Few helping questions when adding methods to repositories:
- What do we need to return? 
  Add methods to the returned entity (collection)'s repository. When fetchin relations, start from the returned collection first, optimize it later.
- Does it sound like an analytic query that works on multiple entities? For example selecting top 100 Users by karma points and all of their comments based on how many bad words they used?
  Create a different repository (analytic).
- Analytic repository grows? 
  Use ISP and depend on the interface. Analytic use-case usually require 1 method only.
- Need flexible filtering based on a combination of poperties and their dynamically included relationships? Only add it where its absolutely necessary, otherwise, use query builders and a generic repository.
  
  
## Extracting validators

As the need to validate objects grow among with the object count, the urge to create a generic validation abstraction appears. 

Validation is part of the object-lifecycle. We should try to design our models to stay valid after creation. 

Validation libraries should be encapsulated and should be hidden behind an interface. In this way, replacing them would be easier. 

Relying on decorators that are modifying properties and override setters is fine as well in this anemic model focused line, we can manually create property setter functions and even have a validator dependency behind them thats exposed through an interface. 

It works differently on application layer where contract validation is done with DTOs through factories and it should throw error before reaching the domain.

# QA

## NO TEST?

This is a dummy code for presentation purposes.

## Use case and action are the same?

They look the same but they represent different things.
The action connects the layers and pulls in implementations whereas the use-case uses blueprints and focuses on business.

### But my framework does this through DI and middleware-chain

If your action relies on validated and strict models and its dependencies are limited and your domain does not know about those implementations, it could be fine.

It is often not the case, as actions usually interact with responders that leak implementation detail to business, breaching layers and linking domain to infrastructure implementation, like sending http status codes and returning json. Both are part of an api contract, not the domain contract.






