'use strict';

/**
 * image controller
 */

const { factories } = require('@strapi/strapi');

const normalizeLegacyCover = (ctx) => {
  const data = ctx.request.body?.data;
  // Older clients send the former boolean default to mean "no cover".
  if (data && data.cover === false) {
    data.cover = null;
  }
};

module.exports = factories.createCoreController('api::image.image', () => ({
  async create(ctx) {
    normalizeLegacyCover(ctx);
    return super.create(ctx);
  },

  async update(ctx) {
    normalizeLegacyCover(ctx);
    return super.update(ctx);
  },
}));
