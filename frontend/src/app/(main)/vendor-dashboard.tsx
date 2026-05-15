import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme, Avatar, FAB, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';
import { router } from 'expo-router';
import apiClient from '../../api/client';

export default function VendorDashboard() {
  const { user, logout } = useAuthStore();
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string>('PENDING');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const kycRes = await apiClient.get('/kyc/status');
      if (kycRes.data.status) {
        setKycStatus(kycRes.data.status);
      }

      const vendorRes = await apiClient.get('/vendors/me');
      const productsRes = await apiClient.get(`/products/vendor/${vendorRes.data.id}`);
      setProducts(productsRes.data);
    } catch (error) {
      console.log('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Avatar.Text size={64} label={user?.full_name?.substring(0, 2) || 'VN'} style={styles.avatar} labelStyle={{ color: 'black' }} />
          <Text variant="headlineSmall" style={styles.name}>{user?.full_name}</Text>
          <Text variant="bodyMedium" style={styles.role}>Business Owner</Text>
        </View>

        <View style={styles.content}>
          <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Verification Status</Text>
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: kycStatus === 'VERIFIED' ? '#4CAF50' : '#FF9800' }
                ]}>
                  <Text style={styles.statusText}>{kycStatus}</Text>
                </View>
                {kycStatus !== 'VERIFIED' && (
                  <Button mode="text" onPress={() => router.push('/(main)/kyc-intro')}>
                    Complete KYC
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>

          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Card style={[styles.actionCard, { backgroundColor: theme.colors.surface }]} onPress={() => router.push('/(main)/manage-business')}>
              <Card.Content style={styles.actionCardContent}>
                <Avatar.Icon size={40} icon="storefront" style={{ backgroundColor: theme.colors.primary }} color="black" />
                <Text variant="labelLarge" style={[styles.actionLabel, { color: theme.colors.onSurface }]}>Manage Business</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.actionCard, { backgroundColor: theme.colors.surface }]} onPress={() => router.push('/(main)/analytics')}>
              <Card.Content style={styles.actionCardContent}>
                <Avatar.Icon size={40} icon="chart-bar" style={{ backgroundColor: theme.colors.primary }} color="black" />
                <Text variant="labelLarge" style={[styles.actionLabel, { color: theme.colors.onSurface }]}>Analytics</Text>
              </Card.Content>
            </Card>
          </View>

          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface, marginTop: 24 }]}>My Products ({products.length})</Text>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : products.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>No products added yet.</Text>
              <Button mode="contained" onPress={() => router.push('/(main)/manage-business')}>
                Post Your First Product
              </Button>
            </View>
          ) : (
            products.map((p: any) => (
              <Card key={p.id} style={[styles.productCard, { backgroundColor: theme.colors.surface }]}>
                <Card.Title 
                  title={p.name} 
                  subtitle={`R ${p.price}`} 
                  titleStyle={{ color: theme.colors.onSurface }}
                  subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
                />
              </Card>
            ))
          )}

          <Button mode="outlined" style={styles.logoutBtn} onPress={handleLogout} textColor={theme.colors.error}>
            Logout
          </Button>
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        label="Add Product"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="black"
        onPress={() => router.push({
          pathname: '/(main)/manage-business',
          params: { action: 'add' }
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  name: {
    color: '#000',
    fontWeight: 'bold',
  },
  role: {
    color: 'rgba(0,0,0,0.6)',
  },
  content: {
    padding: 20,
  },
  statusCard: {
    marginBottom: 24,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    elevation: 2,
  },
  actionCardContent: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  actionLabel: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 12,
  },
  productCard: {
    marginBottom: 12,
  },
  logoutBtn: {
    marginTop: 40,
    borderColor: '#B00020',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 110, // Higher than the BottomNav
  },
});
