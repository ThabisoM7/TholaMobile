import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, Card, useTheme, ActivityIndicator, IconButton, Avatar, List, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import apiClient from '../../api/client';

export default function Analytics() {
  const theme = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/vendors/analytics');
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'VIEW_PROFILE': return 'eye';
      case 'VIEW_PRODUCT': return 'package-variant';
      case 'INTERESTED': return 'heart';
      default: return 'bell';
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case 'INTERESTED': return '#E91E63';
      case 'VIEW_PROFILE': return '#2196F3';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.headerTitle}>Analytics & Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text variant="titleSmall" style={styles.statLabel}>Total Views</Text>
              <Text variant="displaySmall" style={styles.statValue}>{stats?.totalViews || 0}</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#FFF9C4' }]}>
            <Card.Content style={styles.statContent}>
              <Text variant="titleSmall" style={styles.statLabel}>Interests</Text>
              <Text variant="displaySmall" style={[styles.statValue, { color: '#FBC02D' }]}>
                {stats?.totalInterest || 0}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Text variant="titleLarge" style={styles.sectionTitle}>Recent Activity</Text>
        
        <Card style={styles.activityCard}>
          {stats?.recentInteractions?.length > 0 ? (
            stats.recentInteractions.map((item: any, index: number) => (
              <View key={item.id}>
                <List.Item
                  title={item.user.full_name}
                  description={`${item.type.replace('_', ' ')} • ${new Date(item.createdAt).toLocaleDateString()}`}
                  left={props => (
                    <Avatar.Icon 
                      {...props} 
                      icon={getInteractionIcon(item.type)} 
                      size={40} 
                      style={{ backgroundColor: getInteractionColor(item.type) }} 
                    />
                  )}
                  right={props => (
                    item.type === 'INTERESTED' ? <List.Icon {...props} icon="star" color="#FBC02D" /> : null
                  )}
                />
                {index < stats.recentInteractions.length - 1 && <Divider />}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium">No recent activity found.</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statLabel: {
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  }
});
