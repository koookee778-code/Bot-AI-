import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://yuxdhhzjbuccypwcvtyd.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1eGRoaHpqYnVjY3lwd2N2dHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMzEzNzQsImV4cCI6MjEwOTgwNzM3NH0.2PJ6t6bzB0-eOwru7RHwv6gan7ghiYcfY3SdEjNRrqw';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface WebsiteService {
    id: string;
    title_ar: string;
    title_en: string;
    description_ar: string;
    description_en: string;
    category: string;
    icon?: string;
    active?: boolean;
    sort_order?: number;
    created_at?: string;
}

export interface WebsiteOrder {
    id: string;
    client_name: string;
    phone: string;
    company_or_brand?: string;
    service_id?: string;
    service_title: string;
    details: string;
    status?: string;
    source?: string;
    whatsapp_notified?: boolean;
    telegram_notified?: boolean;
    created_at?: string;
}

/**
 * Fetches all active services from Supabase
 */
export async function getActiveServices(): Promise<WebsiteService[]> {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return (data || []) as WebsiteService[];
    } catch (err: any) {
        console.error('[Supabase getActiveServices Error]:', err?.message || err);
        return [];
    }
}

/**
 * Adds a new service to the website in Supabase
 */
export async function addWebsiteService(service: {
    id?: string;
    title_ar: string;
    title_en?: string;
    description_ar: string;
    description_en?: string;
    category?: string;
    icon?: string;
}): Promise<WebsiteService> {
    const rawId = service.id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newService: WebsiteService = {
        id: rawId.toLowerCase().replace(/\s+/g, '-'),
        title_ar: service.title_ar,
        title_en: service.title_en || service.title_ar,
        description_ar: service.description_ar,
        description_en: service.description_en || service.description_ar,
        category: service.category || 'custom-services',
        icon: service.icon || 'Sparkles',
        active: true,
        sort_order: 99
    };

    const { data, error } = await supabase
        .from('services')
        .upsert(newService)
        .select()
        .single();

    if (error) {
        console.error('[Supabase addWebsiteService Error]:', error);
        throw error;
    }

    console.log(`[Supabase] Service added successfully: ${newService.title_ar} (${newService.id})`);
    return data as WebsiteService;
}

/**
 * Removes or deactivates a service from the website
 */
export async function removeWebsiteService(serviceIdOrTitle: string): Promise<boolean> {
    const term = serviceIdOrTitle.trim();
    // Try by ID first, then by title
    const { error } = await supabase
        .from('services')
        .delete()
        .or(`id.eq.${term},title_ar.ilike.%${term}%,title_en.ilike.%${term}%`);

    if (error) {
        console.error('[Supabase removeWebsiteService Error]:', error);
        throw error;
    }

    console.log(`[Supabase] Service removed: ${term}`);
    return true;
}

/**
 * Records or updates an order in Supabase
 */
export async function saveOrderToSupabase(order: WebsiteOrder): Promise<WebsiteOrder> {
    const { data, error } = await supabase
        .from('orders')
        .upsert({
            ...order,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('[Supabase saveOrder Error]:', error);
        throw error;
    }

    return data as WebsiteOrder;
}

/**
 * Retrieves live analytics & orders summary for the management
 */
export async function getLiveStats(): Promise<{
    totalVisits: number;
    totalOrders: number;
    newOrders: number;
    activeServicesCount: number;
    recentOrders: WebsiteOrder[];
}> {
    try {
        // 1. Total Visits
        const { count: visitsCount, error: vErr } = await supabase
            .from('analytics')
            .select('*', { count: 'exact', head: true });

        // 2. Total Orders
        const { data: allOrders, error: oErr } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        // 3. Active Services
        const { count: servicesCount } = await supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('active', true);

        const ordersList = (allOrders || []) as WebsiteOrder[];
        const newOrdersCount = ordersList.filter(o => o.status === 'new' || !o.status).length;

        return {
            totalVisits: visitsCount || 0,
            totalOrders: ordersList.length,
            newOrders: newOrdersCount,
            activeServicesCount: servicesCount || 0,
            recentOrders: ordersList.slice(0, 5)
        };
    } catch (err: any) {
        console.error('[Supabase getLiveStats Error]:', err?.message || err);
        return {
            totalVisits: 0,
            totalOrders: 0,
            newOrders: 0,
            activeServicesCount: 0,
            recentOrders: []
        };
    }
}
