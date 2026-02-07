import axios from 'axios';
import { prisma } from '../lib/prisma';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  source: string;
  publishedAt: string;
}

interface InterestUpdate {
  interest: string;
  articles: NewsArticle[];
  conversationStarters: string[];
}

// In-memory cache for news
const newsCache = new Map<string, { data: NewsArticle[]; expiresAt: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export class InterestNewsService {
  private static apiKey = process.env.NEWS_API_KEY;

  /**
   * Fetch news articles for a specific interest/topic
   */
  static async getNewsForInterest(interest: string): Promise<NewsArticle[]> {
    // Check cache first
    const cacheKey = interest.toLowerCase();
    const cached = newsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`📰 Cache hit for "${interest}"`);
      return cached.data;
    }

    if (!this.apiKey) {
      console.warn('📰 NEWS_API_KEY not configured');
      return [];
    }

    console.log(`📰 Fetching news for "${interest}" with API key: ${this.apiKey.substring(0, 8)}...`);

    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: interest,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 5,
          apiKey: this.apiKey,
        },
        timeout: 10000,
      });

      console.log(`📰 News API response status: ${response.status}`);

      const articles: NewsArticle[] = (response.data.articles || []).map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage,
        source: article.source?.name || 'Unknown',
        publishedAt: article.publishedAt,
      }));

      // Cache the results
      newsCache.set(cacheKey, {
        data: articles,
        expiresAt: Date.now() + CACHE_TTL,
      });

      console.log(`📰 Cached ${articles.length} articles for "${interest}"`);
      return articles;
    } catch (error: any) {
      console.error(`📰 Failed to fetch news for "${interest}":`, error.message);
      if (error.response) {
        console.error(`📰 Response status: ${error.response.status}`);
        console.error(`📰 Response data:`, error.response.data);
      }
      return [];
    }
  }

  /**
   * Get interest updates for a specific contact
   */
  static async getInterestUpdatesForContact(
    userId: string,
    contactId: string
  ): Promise<InterestUpdate[]> {
    try {
      // Get contact's shared interests
      const relationship = await prisma.relationship.findFirst({
        where: { userId, contactId },
        select: { sharedInterests: true },
      });

      const interests = (relationship?.sharedInterests as string[]) || [];
      if (interests.length === 0) {
        return [];
      }

      // Fetch news for each interest (limit to 3 interests to avoid rate limiting)
      const limitedInterests = interests.slice(0, 3);
      const updates: InterestUpdate[] = [];

      for (const interest of limitedInterests) {
        const articles = await this.getNewsForInterest(interest);
        
        // Generate conversation starters based on articles
        const conversationStarters = articles.slice(0, 2).map(article => {
          return `Did you see ${article.title.split(' - ')[0]}? What do you think about it?`;
        });

        if (articles.length > 0 || conversationStarters.length > 0) {
          updates.push({
            interest,
            articles: articles.slice(0, 3),
            conversationStarters,
          });
        }
      }

      return updates;
    } catch (error) {
      console.error('Failed to get interest updates for contact:', error);
      return [];
    }
  }

  /**
   * Get trending topics for all of a user's shared interests
   */
  static async getTrendingForUser(userId: string): Promise<{
    interest: string;
    headline: string;
    url: string;
  }[]> {
    try {
      console.log('📰 Getting trending for user:', userId);
      
      // Get all unique shared interests from user's relationships
      const relationships = await prisma.relationship.findMany({
        where: { userId },
        select: { sharedInterests: true, contactId: true },
      });

      console.log('📰 Found relationships:', relationships.length);
      console.log('📰 Relationships data:', JSON.stringify(relationships));

      // Flatten and deduplicate interests
      const allInterests = new Set<string>();
      relationships.forEach(r => {
        const interests = (r.sharedInterests as string[]) || [];
        console.log('📰 Contact interests:', interests);
        interests.forEach(i => allInterests.add(i));
      });

      console.log('📰 All unique interests:', Array.from(allInterests));

      if (allInterests.size === 0) {
        console.log('📰 No shared interests found, returning empty array');
        return [];
      }

      // Get top 5 interests
      const topInterests = Array.from(allInterests).slice(0, 5);
      const trending: { interest: string; headline: string; url: string }[] = [];

      console.log('📰 Fetching news for interests:', topInterests);

      for (const interest of topInterests) {
        const articles = await this.getNewsForInterest(interest);
        console.log(`📰 Articles for "${interest}":`, articles.length);
        if (articles.length > 0) {
          trending.push({
            interest,
            headline: articles[0].title,
            url: articles[0].url,
          });
        }
      }

      console.log('📰 Final trending data:', trending.length, 'items');
      return trending;
    } catch (error) {
      console.error('Failed to get trending for user:', error);
      return [];
    }
  }

  /**
   * Get contacts who share a specific interest with recent news
   */
  static async getContactsForInterest(
    userId: string,
    interest: string
  ): Promise<{
    contactId: string;
    contactName: string;
    latestNews: NewsArticle | null;
  }[]> {
    try {
      // Find contacts with this shared interest
      const relationships = await prisma.relationship.findMany({
        where: {
          userId,
          sharedInterests: {
            has: interest,
          },
        },
        include: {
          contact: {
            select: { id: true, name: true },
          },
        },
      });

      // Get latest news for the interest
      const articles = await this.getNewsForInterest(interest);
      const latestNews = articles.length > 0 ? articles[0] : null;

      return relationships.map(r => ({
        contactId: r.contact.id,
        contactName: r.contact.name,
        latestNews,
      }));
    } catch (error) {
      console.error('Failed to get contacts for interest:', error);
      return [];
    }
  }
}
