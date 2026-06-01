import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import path from 'path';
import {
  listSkillPackages,
  readSkillFile,
  resolveSkillsRoot,
} from '../utils/skills-path';

export class SkillsController {
  register(fastify: FastifyInstance) {
    fastify.get('/', this.manifest);
    fastify.get<{ Params: { skillName: string; '*': string } }>(
      '/:skillName/*',
      this.getFile,
    );
    fastify.get<{ Params: { skillName: string } }>(
      '/:skillName',
      this.getSkillMd,
    );
  }

  private manifest = async (_req: FastifyRequest, reply: FastifyReply) => {
    const root = resolveSkillsRoot();
    if (!root) {
      return reply.code(503).send({
        code: 'SKILLS_UNAVAILABLE',
        message:
          'Agent skills are not bundled. Reinstall mockoto or run from the monorepo with .cursor/skills.',
      });
    }

    const packages = listSkillPackages(root).map((pkg) => ({
      name: pkg.name,
      entrypoint: `${pkg.name}/SKILL.md`,
      files: pkg.files.map((f) => f.relativePath),
      installHint: `Copy ${root} into your agent skills directory (e.g. .cursor/skills/)`,
    }));

    return reply.send({
      root,
      cursorCopyFrom: root,
      packages,
    });
  };

  private getSkillMd = async (
    req: FastifyRequest<{ Params: { skillName: string } }>,
    reply: FastifyReply,
  ) => {
    const root = resolveSkillsRoot();
    if (!root) {
      return reply.code(503).send({ code: 'SKILLS_UNAVAILABLE', message: 'Skills not found' });
    }

    const content = readSkillFile(root, req.params.skillName, `${req.params.skillName}/SKILL.md`);
    if (content === null) {
      return reply.code(404).send({ message: `Skill "${req.params.skillName}" not found` });
    }

    return reply.type('text/markdown; charset=utf-8').send(content);
  };

  private getFile = async (
    req: FastifyRequest<{ Params: { skillName: string; '*': string } }>,
    reply: FastifyReply,
  ) => {
    const root = resolveSkillsRoot();
    if (!root) {
      return reply.code(503).send({ code: 'SKILLS_UNAVAILABLE', message: 'Skills not found' });
    }

    const sub = req.params['*'] ?? 'SKILL.md';
    const relativePath = path.posix.join(req.params.skillName, sub);
    const content = readSkillFile(root, req.params.skillName, relativePath);

    if (content === null) {
      return reply.code(404).send({ message: `File not found: ${relativePath}` });
    }

    const ext = path.extname(sub).toLowerCase();
    const type =
      ext === '.md' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8';

    return reply.type(type).send(content);
  };
}
