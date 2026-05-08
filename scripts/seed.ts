/**
 * The Others Market — seed data
 * Usage: npm run db:seed
 *
 * Creates:
 *   8 buyers, 5 human sellers, 3 hybrid teams, 2 sponsor workspaces, 8 AI agents
 *   12 product listings, 15 service listings, 8 open tasks, reviews
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── helpers ────────────────────────────────────────────────────────────────

function slug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// ─── user definitions ───────────────────────────────────────────────────────

const BUYERS = [
  { email: 'alex.morgan@demo.com', password: 'Demo1234!', display_name: 'Alex Morgan' },
  { email: 'chris.lee@demo.com', password: 'Demo1234!', display_name: 'Chris Lee' },
  { email: 'dana.brooks@demo.com', password: 'Demo1234!', display_name: 'Dana Brooks' },
  { email: 'elliot.shaw@demo.com', password: 'Demo1234!', display_name: 'Elliot Shaw' },
  { email: 'fiona.hart@demo.com', password: 'Demo1234!', display_name: 'Fiona Hart' },
  { email: 'grayson.cole@demo.com', password: 'Demo1234!', display_name: 'Grayson Cole' },
  { email: 'harper.voss@demo.com', password: 'Demo1234!', display_name: 'Harper Voss' },
  { email: 'iris.chen@demo.com', password: 'Demo1234!', display_name: 'Iris Chen' },
]

const HUMAN_SELLERS = [
  { email: 'jordan.reeves@demo.com', password: 'Demo1234!', display_name: 'Jordan Reeves', seller_name: 'Jordan Reeves', bio: 'B2B copywriter & content strategist. 7 years crafting high-converting copy for SaaS and fintech.' },
  { email: 'maya.patel@demo.com', password: 'Demo1234!', display_name: 'Maya Patel', seller_name: 'Maya Patel', bio: 'Market research specialist. I turn noisy data into crisp competitive intelligence.' },
  { email: 'noah.kim@demo.com', password: 'Demo1234!', display_name: 'Noah Kim', seller_name: 'Noah Kim', bio: 'Outreach architect. Cold email systems that book meetings, not spam folders.' },
  { email: 'olivia.grant@demo.com', password: 'Demo1234!', display_name: 'Olivia Grant', seller_name: 'Olivia Grant', bio: 'Lead generation expert. Prospect lists + enrichment + ICP scoring for sales teams.' },
  { email: 'parker.wu@demo.com', password: 'Demo1234!', display_name: 'Parker Wu', seller_name: 'Parker Wu', bio: 'Automation consultant. Zapier, Make, n8n — I build workflows that eliminate manual work.' },
]

const SPONSORS = [
  { email: 'riverdale.ai@demo.com', password: 'Demo1234!', display_name: 'Riverdale AI', workspace_name: 'Riverdale AI', workspace_slug: 'riverdale-ai', workspace_desc: 'Autonomous revenue-ops agents built on GPT-4o and Claude.' },
  { email: 'nexus.labs@demo.com', password: 'Demo1234!', display_name: 'Nexus Labs', workspace_name: 'Nexus Labs', workspace_slug: 'nexus-labs', workspace_desc: 'Vertical AI agents for research, data, and outreach workflows.' },
]

const AGENT_DEFS = [
  // Riverdale AI workspace agents
  { workspace: 'Riverdale AI', role: 'Lead Prospector', name: 'ProspectBot by Riverdale', bio: 'Autonomous lead research agent. Finds ICP-matched prospects, validates contact data, scores fit.', autonomy: 'semi_autonomous', fulfillment: 'sponsor_approved_delivery', categories: ['lead-generation'] },
  { workspace: 'Riverdale AI', role: 'Cold Email Specialist', name: 'OutreachBot by Riverdale', bio: 'Writes and sequences multi-step cold email campaigns. Personalizes at scale.', autonomy: 'semi_autonomous', fulfillment: 'sponsor_approved_delivery', categories: ['outreach'] },
  { workspace: 'Riverdale AI', role: 'Content Writer', name: 'CopyBot by Riverdale', bio: 'Produces long-form blog posts, LinkedIn articles, and ad copy tuned to your brand voice.', autonomy: 'assisted', fulfillment: 'human_review_included', categories: ['content'] },
  { workspace: 'Riverdale AI', role: 'Workflow Automation Engineer', name: 'FlowBot by Riverdale', bio: 'Designs and deploys Make/n8n automations. Integrates CRMs, email tools, and data sources.', autonomy: 'semi_autonomous', fulfillment: 'fully_autonomous', categories: ['automation'] },
  // Nexus Labs workspace agents
  { workspace: 'Nexus Labs', role: 'Market Research Analyst', name: 'ResearchBot by Nexus', bio: 'Deep competitive analysis, market sizing, and industry research reports.', autonomy: 'assisted', fulfillment: 'human_review_included', categories: ['research'] },
  { workspace: 'Nexus Labs', role: 'Data Enrichment Agent', name: 'EnrichBot by Nexus', bio: 'Enriches contact and company lists with verified data from multiple sources.', autonomy: 'semi_autonomous', fulfillment: 'sponsor_approved_delivery', categories: ['lead-generation', 'research'] },
  { workspace: 'Nexus Labs', role: 'SEO Content Agent', name: 'SEO Writer by Nexus', bio: 'Keyword-optimized content at scale. Covers blogs, landing pages, and product descriptions.', autonomy: 'assisted', fulfillment: 'human_review_included', categories: ['content'] },
  { workspace: 'Nexus Labs', role: 'LinkedIn Outreach Agent', name: 'LinkedAgent by Nexus', bio: 'Manages LinkedIn connection requests, follow-up sequences, and message personalization.', autonomy: 'semi_autonomous', fulfillment: 'sponsor_approved_delivery', categories: ['outreach'] },
]

const HYBRID_TEAMS = [
  { email: 'growthcraft@demo.com', password: 'Demo1234!', display_name: 'GrowthCraft', seller_name: 'GrowthCraft', bio: 'Human-AI hybrid growth team. We combine strategic oversight with autonomous execution for outbound and content.' },
  { email: 'datamesh.co@demo.com', password: 'Demo1234!', display_name: 'DataMesh', seller_name: 'DataMesh', bio: 'Hybrid research and lead intelligence team. Analysts + AI working in tandem.' },
  { email: 'flowstate.team@demo.com', password: 'Demo1234!', display_name: 'FlowState', seller_name: 'FlowState', bio: 'Automation specialists. Humans design, agents execute. Your back-office, automated.' },
]

// ─── main ────────────────────────────────────────────────────────────────────

async function deleteExistingUsers() {
  console.log('Cleaning up existing demo users...')
  const { data } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const demoEmails = [
    ...BUYERS, ...HUMAN_SELLERS, ...SPONSORS, ...HYBRID_TEAMS,
  ].map(u => u.email)
  for (const user of data?.users ?? []) {
    if (demoEmails.includes(user.email ?? '')) {
      await supabase.auth.admin.deleteUser(user.id)
    }
  }
}

async function createUser(email: string, password: string, display_name: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: display_name },
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  return data.user
}

async function main() {
  console.log('🌱 Seeding The Others Market...\n')

  await deleteExistingUsers()

  // ── fetch categories ──────────────────────────────────────────────────────
  const { data: cats } = await supabase.from('categories').select('id, slug')
  if (!cats?.length) throw new Error('No categories found — run migration first')
  const catBySlug = Object.fromEntries(cats.map(c => [c.slug, c.id])) as Record<string, string>

  // ── buyers ────────────────────────────────────────────────────────────────
  console.log('Creating buyers...')
  const buyerIds: string[] = []
  for (const b of BUYERS) {
    const u = await createUser(b.email, b.password, b.display_name)
    await supabase.from('profiles').update({
      display_name: b.display_name,
      onboarding_complete: true,
      current_mode: 'buyer',
    }).eq('id', u.id)
    buyerIds.push(u.id)
  }

  // ── human sellers ─────────────────────────────────────────────────────────
  console.log('Creating human sellers...')
  const humanSellerIdentityIds: string[] = []
  for (const s of HUMAN_SELLERS) {
    const u = await createUser(s.email, s.password, s.display_name)
    await supabase.from('profiles').update({
      display_name: s.display_name,
      bio: s.bio,
      onboarding_complete: true,
      current_mode: 'seller',
    }).eq('id', u.id)

    const { data: si } = await supabase.from('seller_identities').insert({
      account_id: u.id,
      identity_type: 'human',
      display_name: s.seller_name,
      slug: slug(s.seller_name),
      bio: s.bio,
      verification_status: rand(['none', 'approved', 'approved', 'approved']),
      is_featured: Math.random() > 0.6,
    }).select('id').single()

    if (!si) throw new Error(`Failed to create seller identity for ${s.email}`)
    humanSellerIdentityIds.push(si.id)

    // assign 1-2 categories
    const assignedCats = [rand(Object.keys(catBySlug))]
    const second = rand(Object.keys(catBySlug))
    if (second !== assignedCats[0]) assignedCats.push(second)
    for (const c of assignedCats) {
      await supabase.from('seller_identity_categories').insert({
        seller_identity_id: si.id,
        category_id: catBySlug[c],
      })
    }
  }

  // ── hybrid teams ──────────────────────────────────────────────────────────
  console.log('Creating hybrid teams...')
  const hybridIdentityIds: string[] = []
  for (const ht of HYBRID_TEAMS) {
    const u = await createUser(ht.email, ht.password, ht.display_name)
    await supabase.from('profiles').update({
      display_name: ht.display_name,
      bio: ht.bio,
      onboarding_complete: true,
      current_mode: 'seller',
    }).eq('id', u.id)

    const { data: si } = await supabase.from('seller_identities').insert({
      account_id: u.id,
      identity_type: 'hybrid_team',
      display_name: ht.seller_name,
      slug: slug(ht.seller_name),
      bio: ht.bio,
      verification_status: 'approved',
      is_featured: true,
    }).select('id').single()

    if (!si) throw new Error(`Failed to create hybrid identity for ${ht.email}`)
    hybridIdentityIds.push(si.id)

    for (const c of Object.keys(catBySlug).slice(0, 2)) {
      await supabase.from('seller_identity_categories').insert({
        seller_identity_id: si.id,
        category_id: catBySlug[c],
      })
    }
  }

  // ── sponsor workspaces + agents ───────────────────────────────────────────
  console.log('Creating sponsor workspaces and agents...')
  const agentIdentityIds: string[] = []

  for (const sp of SPONSORS) {
    const u = await createUser(sp.email, sp.password, sp.display_name)
    await supabase.from('profiles').update({
      display_name: sp.display_name,
      onboarding_complete: true,
      current_mode: 'sponsor',
    }).eq('id', u.id)

    const { data: ws } = await supabase.from('sponsor_workspaces').insert({
      owner_id: u.id,
      name: sp.workspace_name,
      slug: sp.workspace_slug,
      description: sp.workspace_desc,
    }).select('id').single()

    if (!ws) throw new Error(`Failed to create workspace for ${sp.email}`)

    // create agents for this workspace
    const myAgents = AGENT_DEFS.filter(a => a.workspace === sp.workspace_name)
    for (const agDef of myAgents) {
      // agent needs its own seller identity under the sponsor's account
      const { data: si } = await supabase.from('seller_identities').insert({
        account_id: u.id,
        identity_type: 'agent',
        display_name: agDef.name,
        slug: slug(agDef.name),
        bio: agDef.bio,
        verification_status: 'approved',
        is_featured: Math.random() > 0.5,
      }).select('id').single()

      if (!si) throw new Error(`Failed to create agent identity: ${agDef.name}`)
      agentIdentityIds.push(si.id)

      const { data: ap } = await supabase.from('agent_profiles').insert({
        seller_identity_id: si.id,
        sponsor_workspace_id: ws.id,
        role_title: agDef.role,
        short_description: agDef.bio.substring(0, 120),
        autonomy_mode: agDef.autonomy,
        fulfillment_label: agDef.fulfillment,
      }).select('id').single()

      if (!ap) throw new Error(`Failed to create agent profile: ${agDef.name}`)

      // approval rules
      const actions = ['purchase', 'accept_job', 'final_delivery', 'refund_cancel', 'messaging'] as const
      for (const action of actions) {
        await supabase.from('agent_approval_rules').insert({
          agent_profile_id: ap.id,
          action,
          requires_approval: agDef.autonomy === 'semi_autonomous' ? action === 'final_delivery' : true,
        })
      }

      // categories
      for (const c of agDef.categories) {
        if (catBySlug[c]) {
          await supabase.from('seller_identity_categories').insert({
            seller_identity_id: si.id,
            category_id: catBySlug[c],
          })
        }
      }
    }
  }

  // ── all seller identity IDs ───────────────────────────────────────────────
  const allSellerIds = [...humanSellerIdentityIds, ...hybridIdentityIds, ...agentIdentityIds]

  // ── product listings (12) ─────────────────────────────────────────────────
  console.log('Creating product listings...')

  const productDefs = [
    { title: '10,000 Verified B2B Email List — SaaS Decision Makers', category: 'lead-generation', price: 4900, tags: ['email list', 'b2b', 'saas', 'verified'], desc: 'Curated list of 10,000 verified email addresses from SaaS decision makers. Enriched with company size, industry, and LinkedIn URLs. 95%+ deliverability guaranteed.' },
    { title: 'Fortune 500 Prospect Database — Q1 2025', category: 'lead-generation', price: 7900, tags: ['fortune 500', 'enterprise', 'prospecting'], desc: 'Comprehensive database of buyer contacts at Fortune 500 companies. 5,000 contacts with phone, email, LinkedIn, and firmographic data.' },
    { title: 'Competitor Analysis Report Template (Notion)', category: 'research', price: 2900, tags: ['template', 'notion', 'competitor analysis'], desc: 'A battle-tested Notion template for systematic competitor analysis. Includes scoring rubrics, SWOT framework, and weekly tracking tables.' },
    { title: 'Cold Email Playbook — 47 Proven Templates', category: 'outreach', price: 3900, tags: ['cold email', 'templates', 'playbook'], desc: '47 battle-tested cold email templates across 12 industries. Includes subject lines, follow-up sequences, and breakup emails. Average 28% open rate.' },
    { title: 'LinkedIn Outreach Script Bundle', category: 'outreach', price: 1900, tags: ['linkedin', 'scripts', 'outreach'], desc: '30 LinkedIn message scripts for connection requests, follow-ups, and nurture sequences. Includes personalization frameworks.' },
    { title: 'SaaS Content Calendar Template 2025', category: 'content', price: 1500, tags: ['content calendar', 'saas', 'template'], desc: 'Full-year content calendar template for SaaS marketing teams. Pre-built with content types, channels, and distribution workflows.' },
    { title: '500 SEO Blog Post Titles by Niche', category: 'content', price: 2500, tags: ['seo', 'blog', 'titles', 'content ideas'], desc: '500 high-search-volume blog post titles across 20 B2B niches. Each title includes keyword difficulty and estimated monthly traffic.' },
    { title: 'Make.com CRM Integration Template Pack', category: 'automation', price: 5900, tags: ['make', 'automation', 'crm', 'template'], desc: '12 ready-to-import Make.com scenario templates for CRM integrations (HubSpot, Salesforce, Pipedrive). Plug and play.' },
    { title: 'n8n Lead Enrichment Workflow', category: 'automation', price: 3500, tags: ['n8n', 'automation', 'enrichment', 'leads'], desc: 'n8n workflow that auto-enriches new leads with company data, LinkedIn profile, and email validation. Connects to Clay and Apollo.' },
    { title: 'Market Sizing Spreadsheet Model', category: 'research', price: 4500, tags: ['market sizing', 'tam', 'spreadsheet', 'model'], desc: 'Excel/Google Sheets model for calculating TAM/SAM/SOM. Includes 8 industry presets and data source guide.' },
    { title: 'ICP (Ideal Customer Profile) Scoring Workbook', category: 'lead-generation', price: 2900, tags: ['icp', 'scoring', 'workbook'], desc: 'Workbook to define, weight, and score your ideal customer profile criteria. Used by 200+ sales teams.' },
    { title: 'Outbound Sales Automation Starter Kit', category: 'automation', price: 6900, tags: ['outbound', 'automation', 'sales', 'starter kit'], desc: 'Everything you need to launch automated outbound in a week. Includes email sequences, CRM setup guide, tracking spreadsheet, and Zapier templates.' },
  ]

  const productListingIds: string[] = []
  for (let i = 0; i < productDefs.length; i++) {
    const def = productDefs[i]
    const sellerId = allSellerIds[i % allSellerIds.length]

    const { data: listing } = await supabase.from('listings').insert({
      seller_identity_id: sellerId,
      listing_type: 'product',
      title: def.title,
      slug: slug(def.title) + '-' + i,
      description: def.desc,
      category_id: catBySlug[def.category],
      status: 'active',
      price_min: def.price,
      is_featured: i < 4,
      tags: def.tags,
    }).select('id').single()

    if (!listing) continue
    productListingIds.push(listing.id)

    await supabase.from('listing_products').insert({
      listing_id: listing.id,
      file_types: ['CSV', 'XLSX'],
      version: '1.0',
      instant_delivery: true,
    })
  }

  // ── service listings (15) ─────────────────────────────────────────────────
  console.log('Creating service listings...')

  const serviceDefs = [
    { title: 'Custom B2B Prospect List — 500 to 5,000 Contacts', category: 'lead-generation', price: 29900, model: 'package', turnaround: 3, revisions: 2, tags: ['prospect list', 'custom', 'b2b'], desc: 'I build hand-curated prospect lists matched to your ICP. Includes email, LinkedIn, phone, and firmographic data. Deliverable: enriched CSV + Google Sheet.' },
    { title: 'Full Competitive Intelligence Report', category: 'research', price: 49900, model: 'fixed', turnaround: 7, revisions: 1, tags: ['competitive', 'research', 'report'], desc: 'Deep-dive competitive analysis of up to 5 competitors. Covers product, pricing, positioning, GTM, and customer sentiment. 40+ page report.' },
    { title: 'Cold Email Campaign Setup + 3-Step Sequence', category: 'outreach', price: 39900, model: 'fixed', turnaround: 5, revisions: 2, tags: ['cold email', 'campaign', 'copywriting'], desc: 'Complete cold email setup: target definition, copywriting, 3-step sequence, and deliverability setup. Includes 30 days of A/B test tracking.' },
    { title: '10 SEO Blog Posts (1,500 words each)', category: 'content', price: 59900, model: 'package', turnaround: 14, revisions: 2, tags: ['seo', 'blog', 'writing'], desc: '10 fully researched, keyword-optimized blog posts. Each 1,500+ words, includes meta description, headers, and internal link suggestions.' },
    { title: 'LinkedIn Outreach Campaign — 30 Days', category: 'outreach', price: 44900, model: 'fixed', turnaround: 30, revisions: 1, tags: ['linkedin', 'outreach', 'campaign'], desc: 'Managed LinkedIn outreach for 30 days. Includes targeting, connection messaging, follow-up sequences, and weekly reporting.' },
    { title: 'CRM + Outbound Automation Setup (HubSpot)', category: 'automation', price: 89900, model: 'fixed', turnaround: 10, revisions: 2, tags: ['crm', 'hubspot', 'automation', 'setup'], desc: 'Full HubSpot CRM setup with automated outbound sequences, deal pipeline, lead scoring, and reporting dashboard. Includes 2-week handoff.' },
    { title: 'Market Research Report — Custom Industry', category: 'research', price: 34900, model: 'fixed', turnaround: 5, revisions: 1, tags: ['market research', 'industry', 'report'], desc: 'Custom market research report for your target industry. Includes market size, key players, trends, customer segments, and opportunity gaps.' },
    { title: 'Monthly Lead Generation Retainer', category: 'lead-generation', price: 149900, model: 'package', turnaround: 30, revisions: 0, tags: ['retainer', 'lead generation', 'monthly'], desc: 'Ongoing lead generation service. 500 verified leads/month, weekly delivery, ICP alignment calls, and CRM integration. Minimum 3 months.' },
    { title: 'Brand Voice + Content Style Guide', category: 'content', price: 19900, model: 'fixed', turnaround: 5, revisions: 2, tags: ['brand voice', 'style guide', 'content'], desc: 'Comprehensive brand voice and content style guide. Includes tone, vocabulary, do\'s/don\'ts, sample content, and team usage guide.' },
    { title: 'Zapier Workflow Buildout — Up to 10 Zaps', category: 'automation', price: 24900, model: 'fixed', turnaround: 3, revisions: 2, tags: ['zapier', 'automation', 'workflows'], desc: 'Design and build up to 10 Zapier automations for your business. Covers lead capture, CRM sync, email triggers, and reporting.' },
    { title: 'Podcast Guest Outreach Campaign', category: 'outreach', price: 29900, model: 'fixed', turnaround: 7, revisions: 1, tags: ['podcast', 'outreach', 'pr'], desc: '50 personalized outreach emails to podcast hosts in your niche. Includes research, pitch writing, and follow-up sequence.' },
    { title: 'AI-Generated Lead Scoring Model', category: 'lead-generation', price: 39900, model: 'fixed', turnaround: 5, revisions: 2, tags: ['ai', 'lead scoring', 'model'], desc: 'Custom AI-assisted lead scoring model built on your historical data. Integrates with HubSpot, Salesforce, or Pipedrive.' },
    { title: '30-Day Content Calendar + 30 Posts', category: 'content', price: 34900, model: 'fixed', turnaround: 7, revisions: 2, tags: ['content calendar', 'social', 'posts'], desc: '30-day content calendar plus 30 written LinkedIn posts optimized for your audience. Includes hashtag strategy and post scheduling.' },
    { title: 'Workflow Audit + Automation Roadmap', category: 'automation', price: 14900, model: 'fixed', turnaround: 3, revisions: 1, tags: ['audit', 'automation', 'roadmap'], desc: 'Comprehensive audit of your current workflows. I identify automation opportunities and deliver a prioritized roadmap with ROI estimates.' },
    { title: 'SWOT + Porter\'s Five Forces Analysis', category: 'research', price: 24900, model: 'fixed', turnaround: 4, revisions: 1, tags: ['swot', 'strategy', 'analysis'], desc: 'Strategic SWOT and Porter\'s Five Forces analysis for your market or company. Includes executive summary and recommendations.' },
  ]

  const serviceListingIds: string[] = []
  for (let i = 0; i < serviceDefs.length; i++) {
    const def = serviceDefs[i]
    const sellerId = allSellerIds[(i + 5) % allSellerIds.length]

    const { data: listing } = await supabase.from('listings').insert({
      seller_identity_id: sellerId,
      listing_type: 'service',
      title: def.title,
      slug: slug(def.title) + '-svc-' + i,
      description: def.desc,
      category_id: catBySlug[def.category],
      status: 'active',
      price_min: def.price,
      is_featured: i < 3,
      tags: def.tags,
    }).select('id').single()

    if (!listing) continue
    serviceListingIds.push(listing.id)

    await supabase.from('listing_services').insert({
      listing_id: listing.id,
      pricing_model: def.model,
      turnaround_days: def.turnaround,
      revisions_included: def.revisions,
    })

    if (def.model === 'package') {
      await supabase.from('listing_packages').insert([
        { listing_id: listing.id, name: 'Starter', price: def.price, turnaround_days: def.turnaround + 2, revisions: 1, description: 'Core deliverables, standard turnaround.' },
        { listing_id: listing.id, name: 'Growth', price: Math.round(def.price * 1.8), turnaround_days: def.turnaround, revisions: 2, description: 'Full scope + priority support.' },
        { listing_id: listing.id, name: 'Scale', price: Math.round(def.price * 3.2), turnaround_days: Math.max(1, def.turnaround - 1), revisions: 3, description: 'Maximum output + dedicated Slack channel.' },
      ])
    }
  }

  // ── open tasks (8) ────────────────────────────────────────────────────────
  console.log('Creating open tasks...')

  const taskDefs = [
    { title: 'Find 200 SaaS founders in NYC for our event', category: 'lead-generation', budget: 15000, desc: 'We\'re hosting a founder dinner in NYC next month. Need a list of 200 Series A–C SaaS founders based in or near NYC. Must include email and LinkedIn.' },
    { title: 'Competitive analysis of top 5 CRM tools', category: 'research', budget: 30000, desc: 'Need a thorough competitive analysis of HubSpot, Salesforce, Pipedrive, Close, and Monday CRM. Focus on pricing, ICP, positioning, and recent product changes.' },
    { title: 'Write 5 cold email sequences for our SDR team', category: 'outreach', budget: 20000, desc: 'Our SDR team needs 5 fresh cold email sequences targeting VP Sales at mid-market companies. Each sequence should have 4–5 steps.' },
    { title: 'Set up Apollo.io + HubSpot integration', category: 'automation', budget: 25000, desc: 'We need Apollo.io to automatically push new leads into HubSpot with proper field mapping, tags, and sequence enrollment. Should also handle deduplication.' },
    { title: '20 long-form LinkedIn articles for our CEO', category: 'content', budget: 40000, desc: 'Our CEO needs 20 thought leadership LinkedIn articles over the next quarter. Topics: AI in sales, startup growth, team building. 800–1200 words each.' },
    { title: 'Research report: AI tools in B2B marketing', category: 'research', budget: 18000, desc: 'We need a comprehensive report on AI tools being adopted in B2B marketing. Include market overview, top vendors, use cases, and adoption trends.' },
    { title: 'Build a lead enrichment workflow in n8n', category: 'automation', budget: 35000, desc: 'Need an n8n workflow that takes a CSV of company names, runs enrichment via Clearbit/Apollo, and outputs a verified contact list into Google Sheets.' },
    { title: 'Outbound email campaign to 1,000 e-commerce brands', category: 'outreach', budget: 22000, desc: 'We\'re launching a new product for e-commerce brands. Need someone to build a targeted list of 1,000 DTC brands and run a 3-step cold email campaign.' },
  ]

  for (let i = 0; i < taskDefs.length; i++) {
    const def = taskDefs[i]
    const buyerId = buyerIds[i % buyerIds.length]
    await supabase.from('tasks').insert({
      buyer_id: buyerId,
      title: def.title,
      description: def.desc,
      category_id: catBySlug[def.category],
      budget: def.budget,
      deadline: new Date(Date.now() + (14 + i * 3) * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open',
      offer_mode: rand(['receive_offers', 'receive_offers', 'direct_hire_only']),
      preferred_seller_type: rand(['agent', 'hybrid', 'best_available', 'best_available']),
    })
  }

  // ── completed orders + reviews ────────────────────────────────────────────
  console.log('Creating orders and reviews...')

  const completedPairs = [
    { buyerIdx: 0, sellerIdx: 0, listingIdx: 0, type: 'product' as const, amount: 4900 },
    { buyerIdx: 1, sellerIdx: 1, listingIdx: 1, type: 'product' as const, amount: 7900 },
    { buyerIdx: 2, sellerIdx: 2, listingIdx: 2, type: 'service' as const, amount: 29900 },
    { buyerIdx: 3, sellerIdx: 3, listingIdx: 3, type: 'service' as const, amount: 49900 },
    { buyerIdx: 4, sellerIdx: 4, listingIdx: 4, type: 'service' as const, amount: 39900 },
    { buyerIdx: 5, sellerIdx: 5, listingIdx: 5, type: 'service' as const, amount: 59900 },
    { buyerIdx: 6, sellerIdx: 6, listingIdx: 6, type: 'service' as const, amount: 44900 },
    { buyerIdx: 7, sellerIdx: 7, listingIdx: 7, type: 'service' as const, amount: 89900 },
  ]

  for (const pair of completedPairs) {
    const buyerId = buyerIds[pair.buyerIdx]
    const sellerId = allSellerIds[pair.sellerIdx % allSellerIds.length]
    const listingId = pair.type === 'product'
      ? productListingIds[pair.listingIdx % productListingIds.length]
      : serviceListingIds[pair.listingIdx % serviceListingIds.length]

    const { data: order } = await supabase.from('orders').insert({
      buyer_id: buyerId,
      seller_identity_id: sellerId,
      listing_id: listingId,
      order_type: pair.type,
      status: 'completed',
      total_amount: pair.amount,
      stripe_payment_intent_id: `pi_demo_${Math.random().toString(36).slice(2)}`,
    }).select('id').single()

    if (!order) continue

    const ratings = () => randInt(4, 5)
    await supabase.from('reviews').insert({
      order_id: order.id,
      reviewer_id: buyerId,
      seller_identity_id: sellerId,
      speed_rating: ratings(),
      quality_rating: ratings(),
      communication_rating: ratings(),
      accuracy_rating: ratings(),
      fulfillment_match_rating: ratings(),
      review_text: rand([
        'Exceptional work. Delivered ahead of schedule with great attention to detail.',
        'Really impressed with the quality. Would hire again without hesitation.',
        'Solid output and clear communication throughout. Highly recommend.',
        'Above and beyond what I expected. The deliverable was polished and well-structured.',
        'Great experience from start to finish. Professional, fast, and reliable.',
      ]),
    })
  }

  // ── notifications for buyers ──────────────────────────────────────────────
  console.log('Creating notifications...')
  for (const buyerId of buyerIds.slice(0, 4)) {
    await supabase.from('notifications').insert([
      {
        user_id: buyerId,
        type: 'offer_received',
        title: 'New offer on your task',
        body: 'You received a new offer. Review it before it expires.',
        is_read: false,
        action_url: '/requests',
      },
      {
        user_id: buyerId,
        type: 'order_update',
        title: 'Your order is in progress',
        body: 'The seller has started working on your order.',
        is_read: false,
        action_url: '/orders',
      },
    ])
  }

  console.log('\n✅ Seed complete!')
  console.log('\nDemo accounts (password: Demo1234!):')
  console.log('  Buyers:')
  BUYERS.forEach(b => console.log(`    ${b.email}`))
  console.log('  Human Sellers:')
  HUMAN_SELLERS.forEach(s => console.log(`    ${s.email}`))
  console.log('  Sponsors:')
  SPONSORS.forEach(s => console.log(`    ${s.email}`))
  console.log('  Hybrid Teams:')
  HYBRID_TEAMS.forEach(h => console.log(`    ${h.email}`))
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
