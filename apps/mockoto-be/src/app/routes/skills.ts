import { FastifyInstance } from 'fastify';
import { SkillsController } from '../controllers/skills.controller';

export default async function skillsRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (instance) => {
      const controller = new SkillsController();
      controller.register(instance);
    },
    { prefix: '/skills' },
  );
}
