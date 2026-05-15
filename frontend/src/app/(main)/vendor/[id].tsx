import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, Avatar, useTheme, ActivityIndicator, IconButton, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export default function VendorProfile() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interestedProducts, setInterestedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      fetchVendorDetails();
      recordInteraction('VIEW_PROFILE');
    }
  }, [id]);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/vendors/${id}`);
      setVendor(res.data);
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordInteraction = async (type: string, productId?: string) => {
    if (user?.role !== 'CUSTOMER') return;
    try {
      await apiClient.post('/vendors/interaction', {
        vendor_id: id,
        product_id: productId,
        type,
      });
    } catch (error) {
      console.error(`Error recording ${type} interaction:`, error);
    }
  };

  const toggleInterest = async (productId: string) => {
    if (interestedProducts.has(productId)) {
      setInterestedProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    } else {
      setInterestedProducts(prev => {
        const next = new Set(prev);
        next.add(productId);
        return next;
      });
      recordInteraction('INTERESTED', productId);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.centered}>
        <Text>Vendor not found</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Image / Cover */}
      <View style={[styles.cover, { backgroundColor: theme.colors.primary }]}>
        <IconButton 
          icon="arrow-left" 
          iconColor="white" 
          style={styles.backBtn} 
          onPress={() => router.back()} 
        />
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Avatar.Image 
          size={100} 
          source={vendor.logo_url ? { uri: vendor.logo_url } : require('../../../../assets/logo.png')} 
          style={styles.avatar} 
        />
        <Text variant="headlineSmall" style={styles.businessName}>{vendor.business_name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{vendor.category}</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="titleMedium">{vendor.products?.length || 0}</Text>
            <Text variant="labelSmall">Listings</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <Text variant="titleMedium">{vendor.township}</Text>
            <Text variant="labelSmall">Location</Text>
          </View>
        </View>

        <Text variant="bodyMedium" style={styles.description}>
          {vendor.business_description}
        </Text>
      </View>

      <Divider />

      {/* Product Catalog - Nested Grid Layout */}
      <View style={styles.catalogSection}>
        <Text variant="titleLarge" style={styles.sectionTitle}>Listings</Text>
        
        {vendor.products && vendor.products.length > 0 ? (
          <View style={styles.grid}>
            {vendor.products.map((product: any) => (
              <Card 
                key={product.id} 
                style={styles.gridCard} 
                onPress={() => recordInteraction('VIEW_PRODUCT', product.id)}
              >
                {product.image_url ? (
                  <Card.Cover source={{ uri: product.image_url }} style={styles.gridImage} />
                ) : (
                  <View style={[styles.gridImage, styles.imagePlaceholder]}>
                    <MaterialCommunityIcons name="package-variant" size={40} color="#ccc" />
                  </View>
                )}
                <Card.Content style={styles.gridContent}>
                  <Text variant="titleSmall" numberOfLines={1}>{product.name}</Text>
                  <Text variant="bodySmall" numberOfLines={1}>{product.description}</Text>
                  <View style={styles.gridFooter}>
                    <Text variant="labelLarge" style={styles.price}>R {product.price}</Text>
                    <View style={[
                      styles.smallStockBadge, 
                      { backgroundColor: product.in_stock ? '#E8F5E9' : '#FFEBEE' }
                    ]}>
                      <Text style={[
                        styles.smallStockText, 
                        { color: product.in_stock ? '#2E7D32' : '#C62828' }
                      ]}>
                        {product.in_stock ? 'IN STOCK' : 'OUT'}
                      </Text>
                    </View>
                  </View>
                  <IconButton 
                    icon={interestedProducts.has(product.id) ? "star" : "star-outline"} 
                    iconColor={interestedProducts.has(product.id) ? "#FBC02D" : "#757575"} 
                    size={18}
                    style={styles.interestBtn}
                    onPress={() => toggleInterest(product.id)}
                  />
                </Card.Content>
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ color: '#666' }}>This vendor has no listings yet.</Text>
          </View>
        )}
      </View>

      {/* Contact Info */}
      <View style={styles.contactSection}>
        <Button icon="phone" mode="contained" style={styles.contactBtn} onPress={() => {}}>
          Contact Vendor
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cover: {
    height: 120,
    width: '100%',
  },
  backBtn: {
    marginTop: 40,
    marginLeft: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: -50,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 4,
  },
  businessName: {
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  description: {
    textAlign: 'center',
    color: '#555',
    lineHeight: 20,
  },
  catalogSection: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: COLUMN_WIDTH,
    marginBottom: 16,
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridImage: {
    height: COLUMN_WIDTH,
    width: '100%',
    borderRadius: 0,
  },
  imagePlaceholder: {
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: 8,
  },
  gridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontWeight: 'bold',
  },
  smallStockBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  smallStockText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  interestBtn: {
    position: 'absolute',
    top: -12,
    right: -4,
    backgroundColor: '#fff',
    elevation: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  contactSection: {
    padding: 20,
    paddingBottom: 40,
  },
  contactBtn: {
    borderRadius: 8,
  }
});
