/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WaitlistController } from './../controllers/waitlist.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TaskController } from './../controllers/task.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ApiKeyController } from './../controllers/apikey.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AgentController } from './../controllers/agent.controller';
import { expressAuthentication } from './../middleware/tsoa-auth';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';

const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "WaitlistSignupResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "createdAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WaitlistSignupBody": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "company": {"dataType":"string"},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["BUYER"]},{"dataType":"enum","enums":["SELLER"]},{"dataType":"enum","enums":["BOTH"]}],"required":true},
            "useCase": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TaskStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["OPEN"]},{"dataType":"enum","enums":["ACCEPTED"]},{"dataType":"enum","enums":["IN_PROGRESS"]},{"dataType":"enum","enums":["SUBMITTED"]},{"dataType":"enum","enums":["VERIFYING"]},{"dataType":"enum","enums":["COMPLETED"]},{"dataType":"enum","enums":["FAILED"]},{"dataType":"enum","enums":["DISPUTED"]},{"dataType":"enum","enums":["CANCELLED"]},{"dataType":"enum","enums":["EXPIRED"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TaskResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "buyerAgentId": {"dataType":"string","required":true},
            "sellerAgentId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "capabilityRequested": {"dataType":"string","required":true},
            "inputSchema": {"dataType":"any","required":true},
            "inputData": {"dataType":"any"},
            "outputSchema": {"dataType":"any"},
            "outputData": {"dataType":"any"},
            "qualityCriteria": {"dataType":"any"},
            "price": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "timeoutMs": {"dataType":"double","required":true},
            "status": {"ref":"TaskStatus","required":true},
            "acceptedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}]},
            "submittedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}]},
            "completedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}]},
            "expiresAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}]},
            "verificationResult": {"dataType":"any"},
            "disputeReason": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.unknown_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"any"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateTaskBody": {
        "dataType": "refObject",
        "properties": {
            "buyerAgentId": {"dataType":"string","required":true},
            "capabilityRequested": {"dataType":"string","required":true},
            "inputSchema": {"ref":"Record_string.unknown_","required":true},
            "inputData": {"ref":"Record_string.unknown_"},
            "outputSchema": {"ref":"Record_string.unknown_"},
            "qualityCriteria": {"ref":"Record_string.unknown_"},
            "price": {"dataType":"double","required":true},
            "currency": {"dataType":"string"},
            "timeoutMs": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AcceptTaskBody": {
        "dataType": "refObject",
        "properties": {
            "sellerAgentId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SubmitTaskBody": {
        "dataType": "refObject",
        "properties": {
            "sellerAgentId": {"dataType":"string","required":true},
            "outputData": {"ref":"Record_string.unknown_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "VerifyTaskBody": {
        "dataType": "refObject",
        "properties": {
            "passed": {"dataType":"boolean","required":true},
            "verificationResult": {"ref":"Record_string.unknown_"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DisputeTaskBody": {
        "dataType": "refObject",
        "properties": {
            "reason": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResolveDisputeBody": {
        "dataType": "refObject",
        "properties": {
            "resolution": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["release_to_seller"]},{"dataType":"enum","enums":["refund_to_buyer"]}],"required":true},
            "notes": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiKeyInfo": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "keyPrefix": {"dataType":"string","required":true},
            "label": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "agentId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "scopes": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "lastUsedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}],"required":true},
            "expiresAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}],"required":true},
            "revoked": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateApiKeyBody": {
        "dataType": "refObject",
        "properties": {
            "label": {"dataType":"string"},
            "agentId": {"dataType":"string"},
            "scopes": {"dataType":"array","array":{"dataType":"string"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PricingModel": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["PER_CALL"]},{"dataType":"enum","enums":["PER_TASK"]},{"dataType":"enum","enums":["SUBSCRIPTION"]},{"dataType":"enum","enums":["CUSTOM"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthMethod": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["API_KEY"]},{"dataType":"enum","enums":["OAUTH2"]},{"dataType":"enum","enums":["BEARER_TOKEN"]},{"dataType":"enum","enums":["NONE"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AgentStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ACTIVE"]},{"dataType":"enum","enums":["INACTIVE"]},{"dataType":"enum","enums":["SUSPENDED"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AgentResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "endpointUrl": {"dataType":"string","required":true},
            "capabilities": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "pricingModel": {"ref":"PricingModel","required":true},
            "pricePerUnit": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "slaResponseMs": {"dataType":"double"},
            "slaUptimePct": {"dataType":"double"},
            "authMethod": {"ref":"AuthMethod","required":true},
            "status": {"ref":"AgentStatus","required":true},
            "reputationScore": {"dataType":"double","required":true},
            "totalTasks": {"dataType":"double","required":true},
            "successRate": {"dataType":"double","required":true},
            "avgResponseMs": {"dataType":"double","required":true},
            "disputeRate": {"dataType":"double","required":true},
            "metadata": {"dataType":"any"},
            "sampleInput": {"dataType":"any"},
            "sampleOutput": {"dataType":"any"},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateAgentBody": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "ownerId": {"dataType":"string","required":true},
            "endpointUrl": {"dataType":"string","required":true},
            "capabilities": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "pricingModel": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["PER_CALL"]},{"dataType":"enum","enums":["PER_TASK"]},{"dataType":"enum","enums":["SUBSCRIPTION"]},{"dataType":"enum","enums":["CUSTOM"]}]},
            "pricePerUnit": {"dataType":"double"},
            "currency": {"dataType":"string"},
            "slaResponseMs": {"dataType":"double"},
            "slaUptimePct": {"dataType":"double"},
            "authMethod": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["API_KEY"]},{"dataType":"enum","enums":["OAUTH2"]},{"dataType":"enum","enums":["BEARER_TOKEN"]},{"dataType":"enum","enums":["NONE"]}]},
            "metadata": {"ref":"Record_string.unknown_"},
            "sampleInput": {"ref":"Record_string.unknown_"},
            "sampleOutput": {"ref":"Record_string.unknown_"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateAgentBody": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string"},
            "description": {"dataType":"string"},
            "endpointUrl": {"dataType":"string"},
            "capabilities": {"dataType":"array","array":{"dataType":"string"}},
            "pricingModel": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["PER_CALL"]},{"dataType":"enum","enums":["PER_TASK"]},{"dataType":"enum","enums":["SUBSCRIPTION"]},{"dataType":"enum","enums":["CUSTOM"]}]},
            "pricePerUnit": {"dataType":"double"},
            "slaResponseMs": {"dataType":"double"},
            "slaUptimePct": {"dataType":"double"},
            "authMethod": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["API_KEY"]},{"dataType":"enum","enums":["OAUTH2"]},{"dataType":"enum","enums":["BEARER_TOKEN"]},{"dataType":"enum","enums":["NONE"]}]},
            "metadata": {"ref":"Record_string.unknown_"},
            "sampleInput": {"ref":"Record_string.unknown_"},
            "sampleOutput": {"ref":"Record_string.unknown_"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetricType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["TASK_COMPLETED"]},{"dataType":"enum","enums":["TASK_FAILED"]},{"dataType":"enum","enums":["RESPONSE_TIME"]},{"dataType":"enum","enums":["QUALITY_SCORE"]},{"dataType":"enum","enums":["DISPUTE_RAISED"]},{"dataType":"enum","enums":["DISPUTE_RESOLVED"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReputationEventResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "agentId": {"dataType":"string","required":true},
            "taskContractId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "metricType": {"ref":"MetricType","required":true},
            "score": {"dataType":"double","required":true},
            "weight": {"dataType":"double","required":true},
            "metadata": {"dataType":"any"},
            "createdAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReputationResponse": {
        "dataType": "refObject",
        "properties": {
            "agentId": {"dataType":"string","required":true},
            "overallScore": {"dataType":"double","required":true},
            "totalTasks": {"dataType":"double","required":true},
            "successRate": {"dataType":"double","required":true},
            "avgResponseMs": {"dataType":"double","required":true},
            "disputeRate": {"dataType":"double","required":true},
            "recentEvents": {"dataType":"array","array":{"dataType":"refObject","ref":"ReputationEventResponse"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MatchBreakdown": {
        "dataType": "refObject",
        "properties": {
            "capabilityScore": {"dataType":"double","required":true},
            "priceScore": {"dataType":"double","required":true},
            "reputationScore": {"dataType":"double","required":true},
            "responseTimeScore": {"dataType":"double","required":true},
            "uptimeScore": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MatchResult": {
        "dataType": "refObject",
        "properties": {
            "agent": {"ref":"Record_string.unknown_","required":true},
            "matchScore": {"dataType":"double","required":true},
            "breakdown": {"ref":"MatchBreakdown","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MatchResponse": {
        "dataType": "refObject",
        "properties": {
            "matches": {"dataType":"array","array":{"dataType":"refObject","ref":"MatchResult"},"required":true},
            "total": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsWaitlistController_join: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"WaitlistSignupBody"},
        };
        app.post('/waitlist',
            ...(fetchMiddlewares<RequestHandler>(WaitlistController)),
            ...(fetchMiddlewares<RequestHandler>(WaitlistController.prototype.join)),

            async function WaitlistController_join(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWaitlistController_join, request, response });

                const controller = new WaitlistController();

              await templateService.apiHandler({
                methodName: 'join',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_createTask: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateTaskBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/tasks',
            authenticateMiddleware([{"api_key":["write"]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.createTask)),

            async function TaskController_createTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_createTask, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'createTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_searchTasks: Record<string, TsoaRoute.ParameterSchema> = {
                status: {"in":"query","name":"status","ref":"TaskStatus"},
                buyerAgentId: {"in":"query","name":"buyerAgentId","dataType":"string"},
                sellerAgentId: {"in":"query","name":"sellerAgentId","dataType":"string"},
                capability: {"in":"query","name":"capability","dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                offset: {"in":"query","name":"offset","dataType":"double"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.get('/tasks',
            authenticateMiddleware([{"api_key":["read"]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.searchTasks)),

            async function TaskController_searchTasks(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_searchTasks, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'searchTasks',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_getTask: Record<string, TsoaRoute.ParameterSchema> = {
                taskId: {"in":"path","name":"taskId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/tasks/:taskId',
            authenticateMiddleware([{"api_key":["read"]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.getTask)),

            async function TaskController_getTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_getTask, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'getTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_acceptTask: Record<string, TsoaRoute.ParameterSchema> = {
                taskId: {"in":"path","name":"taskId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"AcceptTaskBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/tasks/:taskId/accept',
            authenticateMiddleware([{"api_key":["write"]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.acceptTask)),

            async function TaskController_acceptTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_acceptTask, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'acceptTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_submitTask: Record<string, TsoaRoute.ParameterSchema> = {
                taskId: {"in":"path","name":"taskId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"SubmitTaskBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/tasks/:taskId/submit',
            authenticateMiddleware([{"api_key":["write"]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.submitTask)),

            async function TaskController_submitTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_submitTask, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'submitTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_verifyTask: Record<string, TsoaRoute.ParameterSchema> = {
                taskId: {"in":"path","name":"taskId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"VerifyTaskBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/tasks/:taskId/verify',
            authenticateMiddleware([{"api_key":["write"]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.verifyTask)),

            async function TaskController_verifyTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_verifyTask, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'verifyTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_disputeTask: Record<string, TsoaRoute.ParameterSchema> = {
                taskId: {"in":"path","name":"taskId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"DisputeTaskBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/tasks/:taskId/dispute',
            authenticateMiddleware([{"api_key":["write"]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.disputeTask)),

            async function TaskController_disputeTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_disputeTask, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'disputeTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_resolveDispute: Record<string, TsoaRoute.ParameterSchema> = {
                taskId: {"in":"path","name":"taskId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"ResolveDisputeBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/tasks/:taskId/resolve',
            authenticateMiddleware([{"api_key":["write"]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.resolveDispute)),

            async function TaskController_resolveDispute(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_resolveDispute, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'resolveDispute',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApiKeyController_listKeys: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api-keys',
            authenticateMiddleware([{"api_key":["read"]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiKeyController)),
            ...(fetchMiddlewares<RequestHandler>(ApiKeyController.prototype.listKeys)),

            async function ApiKeyController_listKeys(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiKeyController_listKeys, request, response });

                const controller = new ApiKeyController();

              await templateService.apiHandler({
                methodName: 'listKeys',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApiKeyController_createKey: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateApiKeyBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api-keys',
            authenticateMiddleware([{"api_key":["write"]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiKeyController)),
            ...(fetchMiddlewares<RequestHandler>(ApiKeyController.prototype.createKey)),

            async function ApiKeyController_createKey(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiKeyController_createKey, request, response });

                const controller = new ApiKeyController();

              await templateService.apiHandler({
                methodName: 'createKey',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApiKeyController_revokeKey: Record<string, TsoaRoute.ParameterSchema> = {
                keyId: {"in":"path","name":"keyId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/api-keys/:keyId',
            authenticateMiddleware([{"api_key":["write"]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiKeyController)),
            ...(fetchMiddlewares<RequestHandler>(ApiKeyController.prototype.revokeKey)),

            async function ApiKeyController_revokeKey(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiKeyController_revokeKey, request, response });

                const controller = new ApiKeyController();

              await templateService.apiHandler({
                methodName: 'revokeKey',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAgentController_createAgent: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateAgentBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/agents',
            ...(fetchMiddlewares<RequestHandler>(AgentController)),
            ...(fetchMiddlewares<RequestHandler>(AgentController.prototype.createAgent)),

            async function AgentController_createAgent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAgentController_createAgent, request, response });

                const controller = new AgentController();

              await templateService.apiHandler({
                methodName: 'createAgent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAgentController_searchAgents: Record<string, TsoaRoute.ParameterSchema> = {
                capability: {"in":"query","name":"capability","dataType":"string"},
                minPrice: {"in":"query","name":"minPrice","dataType":"double"},
                maxPrice: {"in":"query","name":"maxPrice","dataType":"double"},
                minReputation: {"in":"query","name":"minReputation","dataType":"double"},
                status: {"in":"query","name":"status","dataType":"union","subSchemas":[{"dataType":"enum","enums":["ACTIVE"]},{"dataType":"enum","enums":["INACTIVE"]},{"dataType":"enum","enums":["SUSPENDED"]}]},
                limit: {"in":"query","name":"limit","dataType":"double"},
                offset: {"in":"query","name":"offset","dataType":"double"},
        };
        app.get('/agents',
            ...(fetchMiddlewares<RequestHandler>(AgentController)),
            ...(fetchMiddlewares<RequestHandler>(AgentController.prototype.searchAgents)),

            async function AgentController_searchAgents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAgentController_searchAgents, request, response });

                const controller = new AgentController();

              await templateService.apiHandler({
                methodName: 'searchAgents',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAgentController_getAgent: Record<string, TsoaRoute.ParameterSchema> = {
                agentId: {"in":"path","name":"agentId","required":true,"dataType":"string"},
        };
        app.get('/agents/:agentId',
            ...(fetchMiddlewares<RequestHandler>(AgentController)),
            ...(fetchMiddlewares<RequestHandler>(AgentController.prototype.getAgent)),

            async function AgentController_getAgent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAgentController_getAgent, request, response });

                const controller = new AgentController();

              await templateService.apiHandler({
                methodName: 'getAgent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAgentController_updateAgent: Record<string, TsoaRoute.ParameterSchema> = {
                agentId: {"in":"path","name":"agentId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateAgentBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.put('/agents/:agentId',
            authenticateMiddleware([{"api_key":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AgentController)),
            ...(fetchMiddlewares<RequestHandler>(AgentController.prototype.updateAgent)),

            async function AgentController_updateAgent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAgentController_updateAgent, request, response });

                const controller = new AgentController();

              await templateService.apiHandler({
                methodName: 'updateAgent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAgentController_getReputation: Record<string, TsoaRoute.ParameterSchema> = {
                agentId: {"in":"path","name":"agentId","required":true,"dataType":"string"},
        };
        app.get('/agents/:agentId/reputation',
            ...(fetchMiddlewares<RequestHandler>(AgentController)),
            ...(fetchMiddlewares<RequestHandler>(AgentController.prototype.getReputation)),

            async function AgentController_getReputation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAgentController_getReputation, request, response });

                const controller = new AgentController();

              await templateService.apiHandler({
                methodName: 'getReputation',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAgentController_matchAgents: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"limit":{"dataType":"double"},"maxResponseMs":{"dataType":"double"},"minReputation":{"dataType":"double"},"maxPrice":{"dataType":"double"},"capability":{"dataType":"string","required":true}}},
        };
        app.post('/agents/match',
            authenticateMiddleware([{"api_key":["read"]}]),
            ...(fetchMiddlewares<RequestHandler>(AgentController)),
            ...(fetchMiddlewares<RequestHandler>(AgentController.prototype.matchAgents)),

            async function AgentController_matchAgents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAgentController_matchAgents, request, response });

                const controller = new AgentController();

              await templateService.apiHandler({
                methodName: 'matchAgents',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
