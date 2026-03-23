import type { FastifyInstance } from "fastify";
import { CampaignWorkspaceBootstrapService } from "../../application/campaign-workspace-bootstrap-service.js";
import { CampaignWorkspaceService } from "../../application/campaign-workspace-service.js";
import { validateCampaignWorkspaceBootstrapInput } from "./validators.js";

export const registerWorkspaceRoutes = (
  app: FastifyInstance,
  campaignWorkspaceService: CampaignWorkspaceService,
  campaignWorkspaceBootstrapService: CampaignWorkspaceBootstrapService,
): void => {
  app.get<{ Params: { id: string } }>(
    "/campaigns/:id/workspace",
    {
      schema: {
        tags: ["campaigns"],
        params: { $ref: "CampaignIdParams#" },
        response: {
          200: { $ref: "CampaignWorkspaceResponse#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const workspace = await campaignWorkspaceService.getByCampaignId(
        request.params.id,
      );

      if (workspace === null) {
        return reply.code(404).send({ message: "Campaign not found" });
      }

      return reply.send(workspace);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/campaigns/:id/workspace/bootstrap-shortlist",
    {
      schema: {
        tags: ["campaigns"],
        params: { $ref: "CampaignIdParams#" },
        body: { $ref: "CampaignWorkspaceBootstrapBody#" },
        response: {
          200: { $ref: "CampaignWorkspaceBootstrapResult#" },
          400: { $ref: "MessageError#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = validateCampaignWorkspaceBootstrapInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      const actionResult = await campaignWorkspaceBootstrapService.bootstrap(
        request.params.id,
        result.data.channels,
      );

      if (!actionResult.success) {
        return reply
          .code(actionResult.statusCode ?? 400)
          .send({ message: actionResult.message });
      }

      return reply.send(actionResult.result);
    },
  );
};
