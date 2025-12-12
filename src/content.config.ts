import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
      archived: z.boolean().default(false),
      readTime: z.number().optional(),
    }),
});

const about = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/data/about" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/data/authors" }),
  schema: z.object({
    name: z.string(),
    latinName: z.string(),
    bio: z.string(),
    latinBio: z.string(),
    avatar: z.string(), // filename in /assets/authors/
    social: z
      .object({
        github: z.string().optional(),
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { blog, about, authors };
