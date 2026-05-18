import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, Avatar, useTheme, ActivityIndicator, IconButton, Button, Divider, Portal, Modal, TextInput } from 'react-native-paper';
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
  const [activeTab, setActiveTab] = useState<'products' | 'promotions'>('products');

  // Ratings & reviews state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsStats, setReviewsStats] = useState<any>({ totalReviews: 0, avgRating: 0 });
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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

  const fetchProductReviews = async (productId: string) => {
    try {
      setReviewsLoading(true);
      const res = await apiClient.get(`/reviews/product/${productId}`);
      setReviews(res.data.reviews || []);
      setReviewsStats(res.data.stats || { totalReviews: 0, avgRating: 0 });
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const submitReview = async () => {
    if (!selectedProduct) return;
    try {
      setSubmittingReview(true);
      await apiClient.post('/reviews', {
        product_id: selectedProduct.id,
        rating: newRating,
        comment: newComment.trim() || undefined
      });
      
      try {
        const { Vibration } = require('react-native');
        Vibration.vibrate(100);
      } catch (e) {}

      setNewComment('');
      setNewRating(5);
      fetchProductReviews(selectedProduct.id);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmittingReview(false);
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

      {/* Segmented Icon Tab Selector */}
      <View style={styles.segmentedTabWrapper}>
        <View style={[styles.segmentedTabBar, { backgroundColor: theme.dark ? '#1a1a1a' : '#f5f5f5' }]}>
          <TouchableOpacity 
            style={[
              styles.segmentedTabItem, 
              activeTab === 'products' && [styles.segmentedTabActiveItem, { backgroundColor: theme.colors.primary }]
            ]}
            onPress={() => setActiveTab('products')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="package-variant-closed" 
              size={20} 
              color={activeTab === 'products' ? '#000000' : theme.dark ? '#888' : '#666'} 
            />
            <Text 
              variant="labelLarge" 
              style={[
                styles.segmentedTabLabel, 
                { color: activeTab === 'products' ? '#000000' : theme.dark ? '#aaa' : '#444', fontWeight: 'bold' }
              ]}
            >
              Products ({vendor.products?.length || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.segmentedTabItem, 
              activeTab === 'promotions' && [styles.segmentedTabActiveItem, { backgroundColor: theme.colors.primary }]
            ]}
            onPress={() => setActiveTab('promotions')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="bullhorn-outline" 
              size={20} 
              color={activeTab === 'promotions' ? '#000000' : theme.dark ? '#888' : '#666'} 
            />
            <Text 
              variant="labelLarge" 
              style={[
                styles.segmentedTabLabel, 
                { color: activeTab === 'promotions' ? '#000000' : theme.dark ? '#aaa' : '#444', fontWeight: 'bold' }
              ]}
            >
              Deals & News ({vendor.promotions?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab 1: Product Catalog */}
      {activeTab === 'products' && (
        <View style={styles.catalogSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Product Catalog</Text>
          
          {vendor.products && vendor.products.length > 0 ? (
            <View style={styles.grid}>
              {vendor.products.map((product: any) => (
                <Card 
                  key={product.id} 
                  style={styles.gridCard} 
                  onPress={() => {
                    recordInteraction('VIEW_PRODUCT', product.id);
                    setSelectedProduct(product);
                    setProductModalVisible(true);
                    fetchProductReviews(product.id);
                  }}
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
      )}

      {/* Tab 2: Events & Promotions */}
      {activeTab === 'promotions' && (
        <View style={styles.promotionsSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Events & Promotions</Text>
          
          {vendor.promotions && vendor.promotions.length > 0 ? (
            <View style={styles.promotionsTimeline}>
              {vendor.promotions.map((promo: any) => (
                <Card 
                  key={promo.id} 
                  style={[
                    styles.promoCard, 
                    { 
                      backgroundColor: theme.colors.elevation.level1,
                      borderColor: theme.dark ? '#333' : '#eee',
                      borderWidth: 1
                    }
                  ]}
                  elevation={1}
                >
                  <Card.Content>
                    <View style={styles.promoHeader}>
                      <View style={[styles.promoIconContainer, { backgroundColor: theme.colors.primary }]}>
                        <MaterialCommunityIcons name="bullhorn-variant" size={18} color="#000" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Stall Update</Text>
                        <Text variant="bodySmall" style={{ color: '#888' }}>
                          {new Date(promo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    
                    <Text variant="bodyLarge" style={[styles.promoTextContent, { color: theme.colors.onSurface }]}>
                      {promo.content}
                    </Text>

                    {promo.image_url && (
                      <Image 
                        source={{ uri: promo.image_url }} 
                        style={styles.promoImage} 
                        resizeMode="cover"
                      />
                    )}
                  </Card.Content>
                </Card>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPromotions}>
              <MaterialCommunityIcons name="bullhorn-variant-outline" size={48} color="#ccc" />
              <Text variant="bodyMedium" style={{ color: '#888', marginTop: 12, textAlign: 'center' }}>
                No active announcements or weekly special flyers posted by this vendor yet.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Contact Info */}
      <View style={styles.contactSection}>
        <Button icon="phone" mode="contained" style={styles.contactBtn} onPress={() => {}}>
          Contact Vendor
        </Button>
      </View>

      {/* Product Detail & Review Modal */}
      <Portal>
        <Modal
          visible={productModalVisible}
          onDismiss={() => {
            setProductModalVisible(false);
            setSelectedProduct(null);
          }}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          {selectedProduct && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Product Info Header */}
              {selectedProduct.image_url ? (
                <Image source={{ uri: selectedProduct.image_url }} style={styles.modalImage} />
              ) : (
                <View style={[styles.modalImage, styles.imagePlaceholder]}>
                  <MaterialCommunityIcons name="package-variant" size={60} color="#ccc" />
                </View>
              )}

              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="headlineSmall" style={styles.modalProductName}>{selectedProduct.name}</Text>
                  <Text variant="bodyMedium" style={{ color: '#666', marginTop: 4 }}>{selectedProduct.description}</Text>
                </View>
                <Text variant="headlineMedium" style={[styles.modalProductPrice, { color: theme.colors.primary }]}>
                  R {selectedProduct.price}
                </Text>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {/* Rating Overview */}
              <View style={styles.ratingOverview}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Ratings & Reviews</Text>
                <View style={styles.avgStarsRow}>
                  <MaterialCommunityIcons name="star" size={20} color="#FBC02D" />
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', marginLeft: 4 }}>
                    {reviewsStats.avgRating > 0 ? `${reviewsStats.avgRating} / 5` : 'No ratings yet'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#777', marginLeft: 8 }}>
                    ({reviewsStats.totalReviews} reviews)
                  </Text>
                </View>
              </View>

              {/* Reviews List */}
              {reviewsLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
              ) : reviews.length > 0 ? (
                <View style={styles.reviewsListContainer}>
                  {reviews.map((rev) => (
                    <View key={rev.id} style={styles.reviewItem}>
                      <View style={styles.reviewUserRow}>
                        <Avatar.Text 
                          size={32} 
                          label={rev.user.full_name ? rev.user.full_name.substring(0, 2).toUpperCase() : 'U'} 
                          style={{ backgroundColor: theme.colors.primary }}
                          labelStyle={{ color: '#fff', fontSize: 12 }}
                        />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{rev.user.full_name}</Text>
                          <Text variant="bodySmall" style={{ color: '#999', fontSize: 10 }}>
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.starsContainer}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <MaterialCommunityIcons
                              key={star}
                              name={star <= rev.rating ? "star" : "star-outline"}
                              size={14}
                              color="#FBC02D"
                            />
                          ))}
                        </View>
                      </View>
                      {rev.comment && (
                        <Text variant="bodyMedium" style={styles.reviewComment}>
                          {rev.comment}
                        </Text>
                      )}
                      <Divider style={{ marginTop: 12 }} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyReviews}>
                  <MaterialCommunityIcons name="comment-text-outline" size={32} color="#ccc" />
                  <Text variant="bodySmall" style={{ color: '#999', marginTop: 8 }}>
                    Be the first to review this listing!
                  </Text>
                </View>
              )}

              {/* Conditional Customer Rating Form */}
              {user?.role === 'CUSTOMER' && (
                <View style={styles.ratingForm}>
                  <Divider style={{ marginVertical: 16 }} />
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
                    Leave a Review
                  </Text>

                  {/* Stars Row */}
                  <View style={styles.formStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity 
                        key={star} 
                        onPress={() => setNewRating(star)}
                        style={{ paddingHorizontal: 6 }}
                      >
                        <MaterialCommunityIcons
                          name={star <= newRating ? "star" : "star-outline"}
                          size={32}
                          color="#FBC02D"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    mode="outlined"
                    label="Share your experience..."
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    numberOfLines={3}
                    style={styles.commentInput}
                    outlineColor="#e0e0e0"
                    activeOutlineColor={theme.colors.primary}
                  />

                  <Button
                    mode="contained"
                    loading={submittingReview}
                    onPress={submitReview}
                    style={styles.submitReviewBtn}
                    labelStyle={{ fontWeight: 'bold' }}
                  >
                    Submit Review
                  </Button>
                </View>
              )}

              <Button
                mode="text"
                onPress={() => {
                  setProductModalVisible(false);
                  setSelectedProduct(null);
                }}
                style={{ marginTop: 16, marginBottom: 8 }}
              >
                Close
              </Button>
            </ScrollView>
          )}
        </Modal>
      </Portal>
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
  },
  modalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalScroll: {
    paddingBottom: 20,
  },
  modalImage: {
    height: 180,
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalProductName: {
    fontWeight: 'bold',
  },
  modalProductPrice: {
    fontWeight: 'bold',
  },
  ratingOverview: {
    marginBottom: 16,
  },
  avgStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewsListContainer: {
    marginTop: 8,
  },
  reviewItem: {
    marginBottom: 12,
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewComment: {
    color: '#333',
    paddingLeft: 42,
    lineHeight: 18,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  ratingForm: {
    marginTop: 8,
  },
  formStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  commentInput: {
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  submitReviewBtn: {
    borderRadius: 8,
  },
  segmentedTabWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  segmentedTabBar: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    overflow: 'hidden',
  },
  segmentedTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  segmentedTabActiveItem: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  segmentedTabLabel: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  promotionsSection: {
    padding: 16,
  },
  promotionsTimeline: {
    gap: 16,
    marginTop: 8,
  },
  promoCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTextContent: {
    lineHeight: 22,
    color: '#333',
    marginBottom: 8,
  },
  promoImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyPromotions: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
});
