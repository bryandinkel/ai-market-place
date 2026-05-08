-- The Others Market — Full Schema Migration
-- Run this in your Supabase SQL editor

-- ================================================
-- ENUMS
-- ================================================

create type identity_type as enum ('human', 'agent', 'hybrid_team');
create type autonomy_mode as enum ('manual', 'assisted', 'semi_autonomous');
create type fulfillment_label as enum ('fully_autonomous', 'human_review_included', 'sponsor_approved_delivery', 'hybrid_fulfillment');
create type listing_type as enum ('product', 'service');
create type listing_status as enum ('draft', 'active', 'paused', 'archived');
create type pricing_model as enum ('fixed', 'package', 'custom_quote');
create type verification_status as enum ('none', 'pending', 'approved', 'rejected');
create type task_status as enum ('open', 'in_review', 'assigned', 'completed', 'cancelled');
create type offer_mode as enum ('receive_offers', 'direct_hire_only');
create type preferred_seller_type as enum ('agent', 'hybrid', 'human', 'best_available');
create type task_offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
create type order_type as enum ('product', 'service', 'task');
create type order_status as enum ('pending_payment', 'paid', 'in_progress', 'delivered', 'revision_requested', 'completed', 'disputed', 'cancelled', 'refunded');
create type delivery_status as enum ('submitted', 'revision_requested', 'approved');
create type message_type as enum ('text', 'system', 'offer', 'approval_request');
create type conversation_context_type as enum ('listing', 'task', 'order', 'direct');
create type approval_action as enum ('purchase', 'accept_job', 'final_delivery', 'refund_cancel', 'messaging');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type dispute_status as enum ('open', 'in_review', 'resolved');
create type report_status as enum ('open', 'reviewed', 'closed');
create type payout_status as enum ('pending', 'paid', 'failed');
create type user_mode as enum ('buyer', 'seller', 'sponsor');

-- ================================================
-- HELPER: updated_at trigger
-- ================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ================================================
-- PROFILES
-- ================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  bio text,
  is_admin boolean not null default false,
  onboarding_complete boolean not null default false,
  current_mode user_mode not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

alter table profiles enable row level security;

create policy "Profiles are publicly viewable" on profiles
  for select using (true);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ================================================
-- SPONSOR WORKSPACES
-- ================================================

create table sponsor_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on sponsor_workspaces(owner_id);
create trigger sw_updated_at before update on sponsor_workspaces
  for each row execute function update_updated_at();

alter table sponsor_workspaces enable row level security;
create policy "Sponsor workspaces viewable by owner" on sponsor_workspaces
  for select using (auth.uid() = owner_id);
create policy "Owner can manage workspace" on sponsor_workspaces
  for all using (auth.uid() = owner_id);

-- ================================================
-- SELLER IDENTITIES
-- ================================================

create table seller_identities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references profiles(id) on delete cascade,
  identity_type identity_type not null,
  display_name text not null,
  slug text not null unique,
  avatar_url text,
  banner_url text,
  bio text,
  verification_status verification_status not null default 'none',
  is_featured boolean not null default false,
  rating_avg numeric(3,2),
  review_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on seller_identities(account_id);
create index on seller_identities(identity_type);
create index on seller_identities(verification_status);
create index on seller_identities(is_featured);
create trigger si_updated_at before update on seller_identities
  for each row execute function update_updated_at();

alter table seller_identities enable row level security;
create policy "Seller identities are publicly viewable" on seller_identities
  for select using (true);
create policy "Owner can manage their identities" on seller_identities
  for all using (auth.uid() = account_id);

-- ================================================
-- AGENT PROFILES
-- ================================================

create table agent_profiles (
  id uuid primary key default gen_random_uuid(),
  seller_identity_id uuid not null unique references seller_identities(id) on delete cascade,
  sponsor_workspace_id uuid not null references sponsor_workspaces(id) on delete cascade,
  role_title text not null,
  short_description text not null,
  autonomy_mode autonomy_mode not null default 'manual',
  fulfillment_label fulfillment_label not null default 'human_review_included',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on agent_profiles(sponsor_workspace_id);
create trigger ap_updated_at before update on agent_profiles
  for each row execute function update_updated_at();

alter table agent_profiles enable row level security;
create policy "Agent profiles publicly viewable" on agent_profiles
  for select using (true);
create policy "Sponsor workspace owner can manage" on agent_profiles
  for all using (
    exists (
      select 1 from sponsor_workspaces sw
      where sw.id = agent_profiles.sponsor_workspace_id
        and sw.owner_id = auth.uid()
    )
  );

-- ================================================
-- AGENT APPROVAL RULES
-- ================================================

create table agent_approval_rules (
  id uuid primary key default gen_random_uuid(),
  agent_profile_id uuid not null references agent_profiles(id) on delete cascade,
  action approval_action not null,
  requires_approval boolean not null default true,
  created_at timestamptz not null default now(),
  unique(agent_profile_id, action)
);

create index on agent_approval_rules(agent_profile_id);

alter table agent_approval_rules enable row level security;
create policy "Approval rules viewable by sponsor owner" on agent_approval_rules
  for select using (
    exists (
      select 1 from agent_profiles ap
      join sponsor_workspaces sw on sw.id = ap.sponsor_workspace_id
      where ap.id = agent_approval_rules.agent_profile_id
        and sw.owner_id = auth.uid()
    )
  );
create policy "Sponsor owner can manage approval rules" on agent_approval_rules
  for all using (
    exists (
      select 1 from agent_profiles ap
      join sponsor_workspaces sw on sw.id = ap.sponsor_workspace_id
      where ap.id = agent_approval_rules.agent_profile_id
        and sw.owner_id = auth.uid()
    )
  );

-- ================================================
-- CATEGORIES
-- ================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  is_custom_task_only boolean not null default false,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
create policy "Categories publicly viewable" on categories
  for select using (true);

-- Seed categories
insert into categories (name, slug, description, icon, is_custom_task_only) values
  ('Lead Generation', 'lead-generation', 'Targeted leads, prospect lists, contact data', '🎯', false),
  ('Research', 'research', 'Market research, competitive analysis, data gathering', '🔬', false),
  ('Outreach', 'outreach', 'Cold email, LinkedIn, multi-channel outreach campaigns', '📡', false),
  ('Content', 'content', 'Written content, copy, social media, long-form', '✍️', false),
  ('Automation', 'automation', 'Workflow automation, integrations, process optimization', '⚙️', false),
  ('Other / Custom Task', 'other-custom-task', 'Custom requests, specialized work, unique tasks', '🔧', true);

-- ================================================
-- SELLER IDENTITY CATEGORIES
-- ================================================

create table seller_identity_categories (
  seller_identity_id uuid not null references seller_identities(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (seller_identity_id, category_id)
);

alter table seller_identity_categories enable row level security;
create policy "Publicly viewable" on seller_identity_categories for select using (true);
create policy "Owner can manage" on seller_identity_categories
  for all using (
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  );

-- ================================================
-- LISTINGS
-- ================================================

create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_identity_id uuid not null references seller_identities(id) on delete cascade,
  listing_type listing_type not null,
  title text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid not null references categories(id),
  status listing_status not null default 'draft',
  price_min int not null default 0,
  is_featured boolean not null default false,
  rating_avg numeric(3,2),
  review_count int not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on listings(seller_identity_id);
create index on listings(listing_type);
create index on listings(category_id);
create index on listings(status);
create index on listings(is_featured);
create index on listings(price_min);
create trigger l_updated_at before update on listings
  for each row execute function update_updated_at();

alter table listings enable row level security;
create policy "Active listings are publicly viewable" on listings
  for select using (status = 'active' or (
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  ));
create policy "Owner can manage listings" on listings
  for all using (
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  );

-- ================================================
-- LISTING PRODUCTS
-- ================================================

create table listing_products (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references listings(id) on delete cascade,
  file_types text[] not null default '{}',
  version text,
  usage_notes text,
  instant_delivery boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table listing_products enable row level security;
create policy "Publicly viewable" on listing_products for select using (true);
create policy "Owner can manage" on listing_products for all using (
  exists (select 1 from listings l join seller_identities si on si.id = l.seller_identity_id
    where l.id = listing_id and si.account_id = auth.uid())
);

-- ================================================
-- LISTING SERVICES
-- ================================================

create table listing_services (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references listings(id) on delete cascade,
  pricing_model pricing_model not null default 'fixed',
  turnaround_days int,
  revisions_included int,
  scope text,
  proof_of_work_expected text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table listing_services enable row level security;
create policy "Publicly viewable" on listing_services for select using (true);
create policy "Owner can manage" on listing_services for all using (
  exists (select 1 from listings l join seller_identities si on si.id = l.seller_identity_id
    where l.id = listing_id and si.account_id = auth.uid())
);

-- ================================================
-- LISTING PACKAGES
-- ================================================

create table listing_packages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  name text not null,
  description text,
  price int not null,
  turnaround_days int,
  revisions int,
  created_at timestamptz not null default now()
);

create index on listing_packages(listing_id);

alter table listing_packages enable row level security;
create policy "Publicly viewable" on listing_packages for select using (true);
create policy "Owner can manage" on listing_packages for all using (
  exists (select 1 from listings l join seller_identities si on si.id = l.seller_identity_id
    where l.id = listing_id and si.account_id = auth.uid())
);

-- ================================================
-- LISTING ADDONS
-- ================================================

create table listing_addons (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  name text not null,
  price int not null,
  description text,
  created_at timestamptz not null default now()
);

create index on listing_addons(listing_id);

alter table listing_addons enable row level security;
create policy "Publicly viewable" on listing_addons for select using (true);
create policy "Owner can manage" on listing_addons for all using (
  exists (select 1 from listings l join seller_identities si on si.id = l.seller_identity_id
    where l.id = listing_id and si.account_id = auth.uid())
);

-- ================================================
-- LISTING MEDIA
-- ================================================

create table listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  url text not null,
  media_type text not null default 'image',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index on listing_media(listing_id);

alter table listing_media enable row level security;
create policy "Publicly viewable" on listing_media for select using (true);
create policy "Owner can manage" on listing_media for all using (
  exists (select 1 from listings l join seller_identities si on si.id = l.seller_identity_id
    where l.id = listing_id and si.account_id = auth.uid())
);

-- ================================================
-- PRODUCT FILES
-- ================================================

create table product_files (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  file_size bigint,
  version text,
  created_at timestamptz not null default now()
);

create index on product_files(listing_id);

alter table product_files enable row level security;
-- Only accessible via server-side after purchase verification
create policy "Owner can manage product files" on product_files for all using (
  exists (select 1 from listings l join seller_identities si on si.id = l.seller_identity_id
    where l.id = listing_id and si.account_id = auth.uid())
);

-- ================================================
-- TASKS
-- ================================================

create table tasks (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category_id uuid not null references categories(id),
  budget int,
  deadline timestamptz,
  status task_status not null default 'open',
  offer_mode offer_mode not null default 'receive_offers',
  preferred_seller_type preferred_seller_type not null default 'best_available',
  is_verified_only boolean not null default false,
  is_flagged boolean not null default false,
  category_fields jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on tasks(buyer_id);
create index on tasks(category_id);
create index on tasks(status);
create trigger t_updated_at before update on tasks
  for each row execute function update_updated_at();

alter table tasks enable row level security;
create policy "Open tasks viewable by authenticated users" on tasks
  for select using (auth.uid() is not null and (status = 'open' or buyer_id = auth.uid()));
create policy "Buyer can manage own tasks" on tasks
  for all using (auth.uid() = buyer_id);

-- ================================================
-- TASK OFFERS
-- ================================================

create table task_offers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  seller_identity_id uuid not null references seller_identities(id) on delete cascade,
  price int not null,
  delivery_days int,
  message text,
  status task_offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on task_offers(task_id);
create index on task_offers(seller_identity_id);
create trigger to_updated_at before update on task_offers
  for each row execute function update_updated_at();

alter table task_offers enable row level security;
create policy "Task buyer and offer seller can view" on task_offers
  for select using (
    auth.uid() in (
      select buyer_id from tasks where id = task_id
    ) or
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  );
create policy "Authenticated sellers can insert offers" on task_offers
  for insert with check (
    auth.uid() is not null and
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  );
create policy "Offer owner can update" on task_offers
  for update using (
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
    or auth.uid() in (select buyer_id from tasks where id = task_id)
  );

-- ================================================
-- ORDERS
-- ================================================

create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id),
  seller_identity_id uuid not null references seller_identities(id),
  listing_id uuid references listings(id),
  task_id uuid references tasks(id),
  order_type order_type not null,
  status order_status not null default 'pending_payment',
  total_amount int not null,
  stripe_payment_intent_id text,
  stripe_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on orders(buyer_id);
create index on orders(seller_identity_id);
create index on orders(status);
create trigger o_updated_at before update on orders
  for each row execute function update_updated_at();

alter table orders enable row level security;
create policy "Buyer and seller can view orders" on orders
  for select using (
    auth.uid() = buyer_id or
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  );
create policy "System can insert orders" on orders
  for insert with check (auth.uid() = buyer_id);

-- ================================================
-- ORDER ITEMS
-- ================================================

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  package_id uuid references listing_packages(id),
  addons jsonb not null default '[]',
  quantity int not null default 1,
  unit_price int not null,
  created_at timestamptz not null default now()
);

alter table order_items enable row level security;
create policy "Order participants can view items" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (
      o.buyer_id = auth.uid() or
      exists (select 1 from seller_identities si where si.id = o.seller_identity_id and si.account_id = auth.uid())
    ))
  );

-- ================================================
-- DELIVERIES
-- ================================================

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  summary text not null,
  notes text,
  delivery_timestamp timestamptz not null default now(),
  status delivery_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on deliveries(order_id);
create trigger d_updated_at before update on deliveries
  for each row execute function update_updated_at();

alter table deliveries enable row level security;
create policy "Order participants can view deliveries" on deliveries
  for select using (
    exists (select 1 from orders o where o.id = order_id and (
      o.buyer_id = auth.uid() or
      exists (select 1 from seller_identities si where si.id = o.seller_identity_id and si.account_id = auth.uid())
    ))
  );
create policy "Seller can insert delivery" on deliveries
  for insert with check (
    exists (select 1 from orders o
      join seller_identities si on si.id = o.seller_identity_id
      where o.id = order_id and si.account_id = auth.uid()
    )
  );
create policy "Delivery participants can update status" on deliveries
  for update using (
    exists (select 1 from orders o where o.id = order_id and (
      o.buyer_id = auth.uid() or
      exists (select 1 from seller_identities si where si.id = o.seller_identity_id and si.account_id = auth.uid())
    ))
  );

-- ================================================
-- DELIVERY ASSETS
-- ================================================

create table delivery_assets (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references deliveries(id) on delete cascade,
  url text not null,
  asset_type text not null default 'file',
  filename text,
  created_at timestamptz not null default now()
);

alter table delivery_assets enable row level security;
create policy "Order participants can view assets" on delivery_assets
  for select using (
    exists (
      select 1 from deliveries d join orders o on o.id = d.order_id
      where d.id = delivery_id and (
        o.buyer_id = auth.uid() or
        exists (select 1 from seller_identities si where si.id = o.seller_identity_id and si.account_id = auth.uid())
      )
    )
  );

-- ================================================
-- PROOF OF WORK CARDS
-- ================================================

create table proof_of_work_cards (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references deliveries(id) on delete cascade,
  fulfillment_mode_label text not null,
  summary text not null,
  structured_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table proof_of_work_cards enable row level security;
create policy "Order participants can view" on proof_of_work_cards
  for select using (
    exists (
      select 1 from deliveries d join orders o on o.id = d.order_id
      where d.id = delivery_id and (
        o.buyer_id = auth.uid() or
        exists (select 1 from seller_identities si where si.id = o.seller_identity_id and si.account_id = auth.uid())
      )
    )
  );

-- ================================================
-- PRODUCT PURCHASES
-- ================================================

create table product_purchases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  buyer_id uuid not null references profiles(id),
  listing_id uuid not null references listings(id),
  product_file_id uuid references product_files(id),
  download_count int not null default 0,
  created_at timestamptz not null default now()
);

create index on product_purchases(buyer_id);
create index on product_purchases(listing_id);

alter table product_purchases enable row level security;
create policy "Buyer can view own purchases" on product_purchases
  for select using (auth.uid() = buyer_id);

-- ================================================
-- REVIEWS
-- ================================================

create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  seller_identity_id uuid not null references seller_identities(id),
  speed_rating int not null check (speed_rating between 1 and 5),
  quality_rating int not null check (quality_rating between 1 and 5),
  communication_rating int not null check (communication_rating between 1 and 5),
  accuracy_rating int not null check (accuracy_rating between 1 and 5),
  fulfillment_match_rating int not null check (fulfillment_match_rating between 1 and 5),
  review_text text,
  overall_avg numeric(3,2) generated always as (
    (speed_rating + quality_rating + communication_rating + accuracy_rating + fulfillment_match_rating)::numeric / 5
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on reviews(seller_identity_id);
create trigger r_updated_at before update on reviews
  for each row execute function update_updated_at();

-- Auto-update seller rating on review insert/update
create or replace function update_seller_rating()
returns trigger language plpgsql as $$
begin
  update seller_identities
  set
    rating_avg = (select avg(overall_avg) from reviews where seller_identity_id = new.seller_identity_id),
    review_count = (select count(*) from reviews where seller_identity_id = new.seller_identity_id)
  where id = new.seller_identity_id;
  return new;
end;
$$;

create trigger reviews_update_seller_rating
  after insert or update on reviews
  for each row execute function update_seller_rating();

alter table reviews enable row level security;
create policy "Reviews are publicly viewable" on reviews
  for select using (true);
create policy "Reviewer can insert review" on reviews
  for insert with check (auth.uid() = reviewer_id);

-- ================================================
-- CONVERSATIONS
-- ================================================

create table conversations (
  id uuid primary key default gen_random_uuid(),
  context_type conversation_context_type not null default 'direct',
  context_id uuid,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger conv_updated_at before update on conversations
  for each row execute function update_updated_at();

alter table conversations enable row level security;
create policy "Participants can view conversations" on conversations
  for select using (
    exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.profile_id = auth.uid())
  );
create policy "Authenticated users can create conversations" on conversations
  for insert with check (auth.uid() is not null);

-- ================================================
-- CONVERSATION PARTICIPANTS
-- ================================================

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

alter table conversation_participants enable row level security;
create policy "Participants can view own participations" on conversation_participants
  for select using (profile_id = auth.uid() or
    exists (select 1 from conversation_participants cp2 where cp2.conversation_id = conversation_id and cp2.profile_id = auth.uid())
  );
create policy "Authenticated can insert participants" on conversation_participants
  for insert with check (auth.uid() is not null);
create policy "Participant can update own read status" on conversation_participants
  for update using (profile_id = auth.uid());

-- ================================================
-- MESSAGES
-- ================================================

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  message_type message_type not null default 'text',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index on messages(conversation_id);
create index on messages(created_at);

alter table messages enable row level security;
create policy "Conversation participants can view messages" on messages
  for select using (
    exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid())
  );
create policy "Participants can send messages" on messages
  for insert with check (
    auth.uid() = sender_id and
    exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.profile_id = auth.uid())
  );

-- ================================================
-- NOTIFICATIONS
-- ================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  action_url text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index on notifications(user_id);
create index on notifications(is_read);

alter table notifications enable row level security;
create policy "User can view own notifications" on notifications
  for select using (auth.uid() = user_id);
create policy "User can update own notifications" on notifications
  for update using (auth.uid() = user_id);
create policy "System can insert notifications" on notifications
  for insert with check (true);

-- ================================================
-- VERIFICATION REQUESTS
-- ================================================

create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  seller_identity_id uuid not null references seller_identities(id) on delete cascade,
  payment_amount int not null default 4900,
  stripe_payment_intent_id text,
  status verification_status not null default 'pending',
  admin_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on verification_requests(seller_identity_id);
create index on verification_requests(status);
create trigger vr_updated_at before update on verification_requests
  for each row execute function update_updated_at();

alter table verification_requests enable row level security;
create policy "Seller identity owner can view own requests" on verification_requests
  for select using (
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  );
create policy "Owner can insert verification request" on verification_requests
  for insert with check (
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  );

-- ================================================
-- APPROVAL REQUESTS
-- ================================================

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  agent_profile_id uuid not null references agent_profiles(id) on delete cascade,
  sponsor_workspace_id uuid not null references sponsor_workspaces(id) on delete cascade,
  action_type approval_action not null,
  context jsonb not null default '{}',
  status approval_status not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on approval_requests(sponsor_workspace_id);
create index on approval_requests(status);
create trigger ar_updated_at before update on approval_requests
  for each row execute function update_updated_at();

alter table approval_requests enable row level security;
create policy "Sponsor owner can view approval requests" on approval_requests
  for select using (
    exists (select 1 from sponsor_workspaces sw where sw.id = sponsor_workspace_id and sw.owner_id = auth.uid())
  );
create policy "Sponsor owner can update approval requests" on approval_requests
  for update using (
    exists (select 1 from sponsor_workspaces sw where sw.id = sponsor_workspace_id and sw.owner_id = auth.uid())
  );
create policy "System can insert approval requests" on approval_requests
  for insert with check (true);

-- ================================================
-- REPORTS
-- ================================================

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  notes text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rep_updated_at before update on reports
  for each row execute function update_updated_at();

alter table reports enable row level security;
create policy "Reporter can view own reports" on reports
  for select using (auth.uid() = reporter_id);
create policy "Authenticated users can submit reports" on reports
  for insert with check (auth.uid() = reporter_id);

-- ================================================
-- DISPUTES
-- ================================================

create table disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  initiator_id uuid not null references profiles(id),
  reason text not null,
  description text,
  status dispute_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on disputes(order_id);
create index on disputes(status);
create trigger dis_updated_at before update on disputes
  for each row execute function update_updated_at();

alter table disputes enable row level security;
create policy "Order participants can view disputes" on disputes
  for select using (
    exists (select 1 from orders o where o.id = order_id and (
      o.buyer_id = auth.uid() or
      exists (select 1 from seller_identities si where si.id = o.seller_identity_id and si.account_id = auth.uid())
    ))
  );
create policy "Order participant can open dispute" on disputes
  for insert with check (
    auth.uid() = initiator_id and
    exists (select 1 from orders o where o.id = order_id and (
      o.buyer_id = auth.uid() or
      exists (select 1 from seller_identities si where si.id = o.seller_identity_id and si.account_id = auth.uid())
    ))
  );

-- ================================================
-- PAYOUT RECORDS
-- ================================================

create table payout_records (
  id uuid primary key default gen_random_uuid(),
  seller_identity_id uuid not null references seller_identities(id) on delete cascade,
  amount int not null,
  stripe_transfer_id text,
  status payout_status not null default 'pending',
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on payout_records(seller_identity_id);
create trigger pr_updated_at before update on payout_records
  for each row execute function update_updated_at();

alter table payout_records enable row level security;
create policy "Seller identity owner can view payouts" on payout_records
  for select using (
    exists (select 1 from seller_identities si where si.id = seller_identity_id and si.account_id = auth.uid())
  );

-- ================================================
-- FAVORITES
-- ================================================

create table favorites (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  seller_identity_id uuid not null references seller_identities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(buyer_id, seller_identity_id)
);

create index on favorites(buyer_id);

alter table favorites enable row level security;
create policy "User can view own favorites" on favorites
  for select using (auth.uid() = buyer_id);
create policy "User can manage own favorites" on favorites
  for all using (auth.uid() = buyer_id);
