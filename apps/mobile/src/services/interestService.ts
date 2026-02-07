import { apiClient } from '../config/api';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  source: string;
  publishedAt: string;
}

export interface InterestUpdate {
  interest: string;
  articles: NewsArticle[];
  conversationStarters: string[];
}

export interface TrendingTopic {
  interest: string;
  headline: string;
  url: string;
}

export interface ContactWithInterest {
  contactId: string;
  contactName: string;
  latestNews: NewsArticle | null;
}

class InterestService {
  /**
   * Get interest updates for a specific contact
   */
  async getInterestUpdatesForContact(contactId: string): Promise<InterestUpdate[]> {
    const response = await apiClient.get<{ updates: InterestUpdate[] }>(
      `/interests/contact/${contactId}`
    );
    return response.data.updates;
  }

  /**
   * Get trending news for all user's shared interests
   */
  async getTrending(): Promise<TrendingTopic[]> {
    const response = await apiClient.get<{ trending: TrendingTopic[] }>('/interests/trending');
    return response.data.trending;
  }

  /**
   * Get news for a specific interest
   */
  async getNewsForInterest(interest: string): Promise<NewsArticle[]> {
    const response = await apiClient.get<{ articles: NewsArticle[] }>(
      `/interests/news/${encodeURIComponent(interest)}`
    );
    return response.data.articles;
  }

  /**
   * Get contacts who share a specific interest
   */
  async getContactsForInterest(interest: string): Promise<ContactWithInterest[]> {
    const response = await apiClient.get<{ contacts: ContactWithInterest[] }>(
      `/interests/${encodeURIComponent(interest)}/contacts`
    );
    return response.data.contacts;
  }
}

export default new InterestService();
