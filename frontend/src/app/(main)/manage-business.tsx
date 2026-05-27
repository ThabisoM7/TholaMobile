import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Animated, TouchableWithoutFeedback } from 'react-native';
import { Text, Button, Card, TextInput, FAB, Portal, Modal, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PK || '');
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { uploadImage } from '../../api/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { customMapStyle } from '../../utils/mapStyle';

export default function ManageBusiness() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { action } = useLocalSearchParams();

  // Navigation / Views: 'menu' | 'profile' | 'inventory' | 'loyalty' | 'promotions'
  const [activeView, setActiveView] = useState<'menu' | 'profile' | 'inventory' | 'loyalty' | 'promotions'>('menu');

  // Loyalty Program State
  const [loyaltyStampsNeeded, setLoyaltyStampsNeeded] = useState('8');
  const [loyaltyRewardDesc, setLoyaltyRewardDesc] = useState('');
  const [loyaltyQrPayload, setLoyaltyQrPayload] = useState<string | null>(null);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  // Vendor Profile State
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Products State
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Product Form State
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productInStock, setProductInStock] = useState(true);

  // Edit Business Profile Form State
  const [bizName, setBizName] = useState('');
  const [bizDescription, setBizDescription] = useState('');
  const [bizCategory, setBizCategory] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizTownship, setBizTownship] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizLocation, setBizLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: -26.2041,
    longitude: 28.0473
  });
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Autocomplete Map State
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  // Promotions / Announcements State
  const [promotions, setPromotions] = useState<any[]>([]);
  const [promotionContent, setPromotionContent] = useState('');
  const [promotionImage, setPromotionImage] = useState<string | null>(null);
  const [isPostingPromotion, setIsPostingPromotion] = useState(false);

  useEffect(() => {
    fetchData();
    if (action === 'add') {
      setActiveView('inventory');
      setModalVisible(true);
    }
  }, [action]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch vendor profile
      const vendorRes = await apiClient.get('/vendors/me');
      const profile = vendorRes.data;
      setVendorProfile(profile);

      // Pre-fill profile editing fields
      setBizName(profile.business_name || '');
      setBizDescription(profile.business_description || '');
      setBizCategory(profile.category || '');
      setBizPhone(profile.phone_number || '');
      setBizTownship(profile.township || '');
      setBizAddress(profile.address || '');
      setBizLocation({
        latitude: parseFloat(profile.latitude) || -26.2041,
        longitude: parseFloat(profile.longitude) || 28.0473
      });
      setLogoUri(profile.logo_url || null);
      setBannerUri(profile.banner_url || null);

      // Fetch products
      const productsRes = await apiClient.get(`/products/vendor/${profile.id}`);
      setProducts(productsRes.data);

      // Fetch active loyalty program configuration
      try {
        const loyaltyRes = await apiClient.get('/loyalty/program/me');
        if (loyaltyRes.data) {
          setLoyaltyStampsNeeded(String(loyaltyRes.data.stamps_needed || 8));
          setLoyaltyRewardDesc(loyaltyRes.data.reward_description || '');
          
          // Fetch cryptographically signed daily QR payload string
          const qrRes = await apiClient.get('/loyalty/qr');
          if (qrRes.data && qrRes.data.qrPayload) {
            setLoyaltyQrPayload(qrRes.data.qrPayload);
          }
        }
      } catch (err) {
        console.log('No active loyalty program setup yet.');
      }

      // Fetch active promotions
      try {
        const promoRes = await apiClient.get(`/promotions/vendor/${profile.id}`);
        setPromotions(promoRes.data);
      } catch (promoErr) {
        console.log('Error fetching vendor promotions:', promoErr);
      }
    } catch (error) {
      console.error('Error fetching business/products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLoyaltyProgram = async () => {
    if (!loyaltyStampsNeeded || isNaN(parseInt(loyaltyStampsNeeded))) {
      Alert.alert('Error', 'Please enter a valid number of stamps.');
      return;
    }
    if (!loyaltyRewardDesc) {
      Alert.alert('Error', 'Please describe the loyalty reward.');
      return;
    }

    try {
      setSavingLoyalty(true);
      await apiClient.post('/loyalty/setup', {
        stamps_needed: parseInt(loyaltyStampsNeeded),
        reward_description: loyaltyRewardDesc
      });
      Alert.alert('Success', 'Loyalty program configured successfully!');
      
      // Fetch daily rotating cryptographically signed barcode payload
      const qrRes = await apiClient.get('/loyalty/qr');
      if (qrRes.data && qrRes.data.qrPayload) {
        setLoyaltyQrPayload(qrRes.data.qrPayload);
      }
    } catch (error: any) {
      console.error('Error setting up loyalty:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save loyalty settings.');
    } finally {
      setSavingLoyalty(false);
    }
  };

  // Image Pickers
  const pickProductImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProductImage(result.assets[0].uri);
    }
  };

  const pickLogoImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const pickBannerImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setBannerUri(result.assets[0].uri);
    }
  };

  const pickPromotionImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPromotionImage(result.assets[0].uri);
    }
  };

  const handlePostPromotion = async () => {
    if (!promotionContent.trim()) {
      Alert.alert('Error', 'Please write some text content for your update/offering.');
      return;
    }

    try {
      setIsPostingPromotion(true);
      let uploadedUrl = null;

      if (promotionImage) {
        uploadedUrl = await uploadImage(promotionImage, 'Products');
      }

      await apiClient.post('/promotions', {
        content: promotionContent,
        image_url: uploadedUrl
      });

      Alert.alert('Success', 'Announcement posted successfully!');
      setPromotionContent('');
      setPromotionImage(null);
      fetchData();
    } catch (error) {
      console.error('Error posting promotion:', error);
      Alert.alert('Error', 'Could not post announcement. Please try again.');
    } finally {
      setIsPostingPromotion(false);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this promotion/deal post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/promotions/${id}`);
              Alert.alert('Deleted', 'Announcement deleted successfully.');
              fetchData();
            } catch (error) {
              console.error('Error deleting promotion:', error);
              Alert.alert('Error', 'Could not delete promotion.');
            }
          }
        }
      ]
    );
  };

  // Autocomplete Location Handlers
  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const result = await Location.geocodeAsync(searchQuery);
      if (result.length > 0) {
        setBizLocation({
          latitude: result[0].latitude,
          longitude: result[0].longitude
        });
      } else {
        Alert.alert('Not Found', 'Location not found. Try a different township or street name.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Search Error', 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5&bbox=16.45,-34.83,32.89,-22.12`
        );
        const data = await response.json();
        if (data && Array.isArray(data.features)) {
          setSuggestions(data.features);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 400);

    setSearchTimeout(timeout);
  };

  const handleSelectSuggestion = (item: any) => {
    const coords = item.geometry.coordinates; // [lon, lat]
    const lon = coords[0];
    const lat = coords[1];
    
    setBizLocation({ latitude: lat, longitude: lon });
    
    const prop = item.properties || {};
    
    // Auto-extract township/suburb
    const townshipOrSuburb = prop.locality || prop.district || prop.city || prop.name || '';
    setBizTownship(townshipOrSuburb);
    
    // Construct full display name
    const parts = [];
    if (prop.name) parts.push(prop.name);
    if (prop.street) parts.push(prop.street);
    if (prop.locality || prop.district) parts.push(prop.locality || prop.district);
    if (prop.city) parts.push(prop.city);
    if (prop.country) parts.push(prop.country);
    const displayName = parts.join(', ');
    
    setBizAddress(displayName);
    setSuggestions([]);
    setSearchQuery(displayName);
  };

  // API Submit handlers
  const handleUpdateProfile = async () => {
    if (!bizName || !bizPhone || !bizTownship || !bizAddress) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setUpdatingProfile(true);
      
      let finalLogoUrl = logoUri;
      if (logoUri && !logoUri.startsWith('http')) {
        const uploadedLogo = await uploadImage(logoUri, 'Products');
        if (uploadedLogo) finalLogoUrl = uploadedLogo;
      }

      let finalBannerUrl = bannerUri;
      if (bannerUri && !bannerUri.startsWith('http')) {
        const uploadedBanner = await uploadImage(bannerUri, 'Products');
        if (uploadedBanner) finalBannerUrl = uploadedBanner;
      }

      await apiClient.put(`/vendors/${vendorProfile.id}`, {
        business_name: bizName,
        business_description: bizDescription,
        category: bizCategory,
        phone_number: bizPhone,
        township: bizTownship,
        address: bizAddress,
        latitude: bizLocation.latitude,
        longitude: bizLocation.longitude,
        logo_url: finalLogoUrl,
        banner_url: finalBannerUrl
      });

      Alert.alert('Success', 'Business Profile updated successfully!');
      fetchData(); // reload
      setActiveView('menu');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update business profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAddProduct = async () => {
    if (!productName || !productPrice || !productCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      let imageUrl = '';
      if (productImage) {
        const uploadedUrl = await uploadImage(productImage, 'Products');
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      await apiClient.post('/products', {
        name: productName,
        description: productDescription,
        price: parseFloat(productPrice),
        category: productCategory,
        image_url: imageUrl || null,
        in_stock: productInStock,
      });

      Alert.alert('Success', 'Product added successfully');
      setModalVisible(false);
      resetProductForm();
      fetchData();
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStock = async (id: string, inStock: boolean) => {
    try {
      await apiClient.put(`/products/${id}`, { in_stock: inStock });
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update stock status');
    }
  };

  const handleDeleteProduct = (id: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to remove this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/products/${id}`);
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const resetProductForm = () => {
    setProductName('');
    setProductPrice('');
    setProductDescription('');
    setProductCategory('');
    setProductImage(null);
    setProductInStock(true);
  };

  const SkeletonProductItem = () => {
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, [animatedValue]);

    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <Card 
        style={[
          styles.card, 
          { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.dark ? '#333' : '#eee'
          }
        ]} 
        mode="outlined"
      >
        <View style={styles.cardContent}>
          <Animated.View 
            style={[
              styles.productImage, 
              { 
                backgroundColor: theme.dark ? '#333' : '#e0e0e0',
                opacity 
              }
            ]} 
          />
          <View style={styles.productInfo}>
            <Animated.View 
              style={[
                { 
                  height: 16, 
                  width: '60%', 
                  borderRadius: 4, 
                  backgroundColor: theme.dark ? '#333' : '#e0e0e0',
                  marginBottom: 8,
                  opacity 
                }
              ]} 
            />
            <Animated.View 
              style={[
                { 
                  height: 12, 
                  width: '80%', 
                  borderRadius: 4, 
                  backgroundColor: theme.dark ? '#333' : '#e0e0e0',
                  marginBottom: 12,
                  opacity 
                }
              ]} 
            />
            <View style={styles.priceRow}>
              <Animated.View 
                style={[
                  { 
                    height: 14, 
                    width: '30%', 
                    borderRadius: 4, 
                    backgroundColor: theme.dark ? '#333' : '#e0e0e0',
                    opacity 
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const EmptyCatalog = () => {
    const floatAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, [floatAnim]);

    return (
      <View style={styles.emptyContainer}>
        <Animated.View style={{ transform: [{ translateY: floatAnim }], marginBottom: 16 }}>
          <IconButton 
            icon="package-variant" 
            size={80} 
            iconColor={theme.colors.onSurfaceVariant} 
            style={{ opacity: 0.8 }}
          />
        </Animated.View>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface, textAlign: 'center', marginBottom: 8 }}>
          Your Catalog is Fresh & Ready!
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginHorizontal: 32, marginBottom: 24 }}>
          Add your premium products here so customers browsing the local Township discovery map can find and buy from you.
        </Text>
        <Button 
          mode="contained" 
          icon="plus" 
          onPress={() => setModalVisible(true)}
          contentStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
          style={{ borderRadius: 20 }}
        >
          Post Your First Product
        </Button>
      </View>
    );
  };

  const TouchableScale = ({ onPress, children, style }: { onPress: () => void, children: React.ReactNode, style?: any }) => {
    const scaleValue = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
          {children}
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  // Rendering Helper Sub-Views
  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableScale onPress={() => toggleStock(item.id, !item.in_stock)}>
      <Card 
        style={[
          styles.card, 
          { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.dark ? '#333' : '#eee'
          }
        ]} 
        mode="outlined"
      >
        <View style={styles.cardContent}>
          <Image 
            source={item.image_url ? { uri: item.image_url } : require('../../../assets/icon.png')} 
            style={styles.productImage} 
          />
          <View style={styles.productInfo}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{item.name}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>{item.description}</Text>
            <View style={styles.priceRow}>
              <Text variant="labelLarge" style={[styles.price, { color: theme.colors.primary }]}>R {item.price}</Text>
              <View style={[styles.stockBadge, { backgroundColor: item.in_stock ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={[styles.stockText, { color: item.in_stock ? '#2E7D32' : '#C62828' }]}>
                  {item.in_stock ? 'IN STOCK' : 'OUT OF STOCK'}
                </Text>
              </View>
            </View>
          </View>
          <IconButton 
            icon={item.in_stock ? "check-circle" : "close-circle"} 
            iconColor={item.in_stock ? theme.colors.primary : "#757575"} 
            onPress={() => toggleStock(item.id, !item.in_stock)}
          />
          <IconButton 
            icon="delete-outline" 
            iconColor={theme.colors.error} 
            onPress={() => handleDeleteProduct(item.id)}
          />
        </View>
      </Card>
    </TouchableScale>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <IconButton 
          icon="arrow-left" 
          iconColor="black"
          onPress={() => {
            if (activeView === 'menu') {
              router.back();
            } else {
              setActiveView('menu');
            }
          }} 
        />
        <Text variant="headlineSmall" style={[styles.headerTitle, { color: 'black' }]}>
          {activeView === 'menu' && "Manage Business"}
          {activeView === 'profile' && "Edit Profile"}
          {activeView === 'inventory' && "Product Catalog"}
          {activeView === 'loyalty' && "Configure Loyalty"}
        </Text>
      </View>

      {loading && activeView !== 'inventory' ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {/* VIEW 1: PORTAL LAUNCHER DASHBOARD */}
          {activeView === 'menu' && (
            <View style={styles.launcherContainer}>
              {vendorProfile?.banner_url && (
                <Image source={{ uri: vendorProfile.banner_url }} style={styles.dashboardBanner} />
              )}
              
              <View style={[styles.dashboardHero, { borderBottomColor: theme.dark ? '#333' : '#eee' }]}>
                <Image 
                  source={vendorProfile?.logo_url ? { uri: vendorProfile.logo_url } : require('../../../assets/icon.png')} 
                  style={styles.dashboardLogo} 
                />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {vendorProfile?.business_name}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {vendorProfile?.category} • {vendorProfile?.township}
                  </Text>
                </View>
              </View>

              <ScrollView contentContainerStyle={styles.launcherMenu}>
                <TouchableScale onPress={() => setActiveView('profile')}>
                  <Card 
                    style={[
                      styles.menuCard, 
                      { 
                        backgroundColor: theme.colors.surface, 
                        borderColor: theme.dark ? '#333' : '#eee' 
                      }
                    ]} 
                    mode="outlined"
                  >
                    <Card.Content style={styles.menuCardContent}>
                      <IconButton icon="store-cog" size={40} iconColor={theme.colors.primary} />
                      <View style={styles.menuCardText}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                          Edit Business Profile
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                          Change location, description, phone numbers, logo, and cover photo banner.
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableScale>

                <TouchableScale onPress={() => setActiveView('inventory')}>
                  <Card 
                    style={[
                      styles.menuCard, 
                      { 
                        backgroundColor: theme.colors.surface, 
                        borderColor: theme.dark ? '#333' : '#eee' 
                      }
                    ]} 
                    mode="outlined"
                  >
                    <Card.Content style={styles.menuCardContent}>
                      <IconButton icon="package-variant-closed" size={40} iconColor={theme.colors.primary} />
                      <View style={styles.menuCardText}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                          View Inventory / Catalog
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                          Manage product items, prices, descriptions, and toggle stock availability.
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableScale>

                <TouchableScale onPress={() => setActiveView('loyalty')}>
                  <Card 
                    style={[
                      styles.menuCard, 
                      { 
                        backgroundColor: theme.colors.surface, 
                        borderColor: theme.dark ? '#333' : '#eee' 
                      }
                    ]} 
                    mode="outlined"
                  >
                    <Card.Content style={styles.menuCardContent}>
                      <IconButton icon="ticket-confirmation-outline" size={40} iconColor={theme.colors.primary} />
                      <View style={styles.menuCardText}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                          Configure Loyalty Cards
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                          Set stamps limits, configure repeat rewards, and generate your dynamic shop QR code.
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableScale>

                <TouchableScale onPress={() => setActiveView('promotions')}>
                  <Card 
                    style={[
                      styles.menuCard, 
                      { 
                        backgroundColor: theme.colors.surface, 
                        borderColor: theme.dark ? '#333' : '#eee',
                        marginTop: 16
                      }
                    ]} 
                    mode="outlined"
                  >
                    <Card.Content style={styles.menuCardContent}>
                      <IconButton icon="bullhorn-outline" size={40} iconColor={theme.colors.primary} />
                      <View style={styles.menuCardText}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                          Events & Promotions
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                          Post latest updates, tweet-style announcements, and upload weekly deal flyer pictures.
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableScale>
              </ScrollView>
            </View>
          )}

          {/* VIEW 2: EDIT BUSINESS PROFILE SCREEN */}
          {activeView === 'profile' && (
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView contentContainerStyle={styles.formScroll}>
                
                <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>Business Banner / Cover</Text>
                <TouchableOpacity 
                  style={[
                    styles.bannerPicker, 
                    { 
                      backgroundColor: theme.dark ? theme.colors.elevation.level1 : '#f5f5f5',
                      borderColor: theme.dark ? '#444' : '#ddd'
                    }
                  ]} 
                  onPress={pickBannerImage}
                >
                  {bannerUri ? (
                    <Image source={{ uri: bannerUri }} style={styles.pickedBanner} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconButton icon="image-area" size={40} />
                      <Text style={{ color: theme.colors.onSurface }}>Upload Wide Banner</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.logoAndHeaderRow}>
                  <TouchableOpacity 
                    style={[
                      styles.logoPicker, 
                      { 
                        backgroundColor: theme.dark ? theme.colors.elevation.level1 : '#f5f5f5',
                        borderColor: theme.dark ? '#444' : '#ddd'
                      }
                    ]} 
                    onPress={pickLogoImage}
                  >
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.pickedLogo} />
                    ) : (
                      <View style={styles.bannerUploadPlaceholder}>
                        <IconButton icon="camera" size={30} />
                        <Text style={{ fontSize: 10, textAlign: 'center', color: theme.colors.onSurface }}>Logo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Business Brand</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Tap banner or circle to upload your business imagery.</Text>
                  </View>
                </View>

                <TextInput
                  label="Business Name"
                  value={bizName}
                  onChangeText={setBizName}
                  style={styles.input}
                  mode="outlined"
                />

                <TextInput
                  label="Business Description"
                  value={bizDescription}
                  onChangeText={setBizDescription}
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  mode="outlined"
                />

                <TextInput
                  label="Phone Number"
                  value={bizPhone}
                  onChangeText={setBizPhone}
                  keyboardType="phone-pad"
                  style={styles.input}
                  mode="outlined"
                />

                <TextInput
                  label="Category"
                  value={bizCategory}
                  onChangeText={setBizCategory}
                  style={styles.input}
                  mode="outlined"
                  placeholder="e.g. FOOD & BEVERAGE, CLOTHING, SERVICES"
                />

                {/* Autocomplete Map Trigger Section */}
                <View style={styles.locationSection}>
                  <Text variant="titleMedium" style={[styles.sectionLabel, { marginBottom: 8, color: theme.colors.onSurface }]}>Location on Map</Text>
                  <View 
                    style={[
                      styles.locationPreview, 
                      { 
                        backgroundColor: theme.dark ? theme.colors.elevation.level1 : '#F8F9FA',
                        borderColor: theme.dark ? '#333' : '#eee'
                      }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Township Set:</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{bizTownship || "Not set"}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={1}>
                        {bizAddress || "No address pinned"}
                      </Text>
                    </View>
                    <Button 
                      mode="outlined" 
                      onPress={() => setShowMap(true)}
                      icon="map-marker-radius"
                    >
                      Search Map
                    </Button>
                  </View>
                </View>

                <Button 
                  mode="contained" 
                  onPress={handleUpdateProfile} 
                  loading={updatingProfile}
                  disabled={updatingProfile}
                  style={styles.submitBtn}
                >
                  Save Profile Changes
                </Button>
                
                <Button 
                  mode="text" 
                  onPress={() => setActiveView('menu')}
                  disabled={updatingProfile}
                >
                  Cancel
                </Button>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* VIEW 3: INVENTORY LIST VIEW */}
          {activeView === 'inventory' && (
            <>
              {loading ? (
                <FlatList
                  data={[1, 2, 3, 4]}
                  keyExtractor={(item) => item.toString()}
                  renderItem={() => <SkeletonProductItem />}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <FlatList
                  data={products}
                  keyExtractor={(item: any) => item.id}
                  renderItem={renderProductItem}
                  contentContainerStyle={styles.list}
                  ListEmptyComponent={<EmptyCatalog />}
                  showsVerticalScrollIndicator={false}
                />
              )}

              <FAB
                icon="plus"
                label="Add Product"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="black"
                onPress={() => setModalVisible(true)}
              />
            </>
          )}

          {/* VIEW 4: CONFIGURE LOYALTY CARDS */}
          {activeView === 'loyalty' && (
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
                
                <Card 
                  style={[
                    styles.menuCard, 
                    { 
                      backgroundColor: theme.colors.elevation.level1, 
                      borderColor: theme.dark ? '#333' : '#eee',
                      marginBottom: 16
                    }
                  ]}
                  mode="outlined"
                >
                  <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <IconButton icon="qrcode-scan" size={48} iconColor={theme.colors.primary} />
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface, textAlign: 'center' }}>
                      Loyalty Stamp Settings
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                      Configure how many stamp purchases customers need to claim a free loyalty reward at your stall.
                    </Text>
                  </Card.Content>
                </Card>

                <TextInput
                  label="Stamps Needed for Reward"
                  value={loyaltyStampsNeeded}
                  onChangeText={setLoyaltyStampsNeeded}
                  keyboardType="numeric"
                  style={styles.input}
                  mode="outlined"
                  placeholder="e.g. 8"
                />

                <TextInput
                  label="Reward Description"
                  value={loyaltyRewardDesc}
                  onChangeText={setLoyaltyRewardDesc}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Get a free coffee, or a warm township fat cake (magwinya) on your 8th buy!"
                />

                <Button 
                  mode="contained" 
                  onPress={handleSaveLoyaltyProgram} 
                  loading={savingLoyalty}
                  disabled={savingLoyalty}
                  style={styles.submitBtn}
                >
                  Save Program Settings
                </Button>

                {loyaltyQrPayload && (
                  <Card 
                    style={[
                      styles.menuCard, 
                      { 
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#eee',
                        marginTop: 24,
                        paddingVertical: 16,
                        alignItems: 'center'
                      }
                    ]}
                    mode="outlined"
                  >
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#000000', marginBottom: 12 }}>
                      Your Live Shop QR Stamp
                    </Text>
                    <Image 
                      source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(loyaltyQrPayload)}` }} 
                      style={{ width: 220, height: 220, borderRadius: 8 }} 
                    />
                    <Text variant="bodySmall" style={{ color: '#666666', textAlign: 'center', marginTop: 12, marginHorizontal: 16 }}>
                      Customers scan this via their Thola mobile app to log purchases. Signature expires daily to prevent cloning fraud.
                    </Text>
                  </Card>
                )}

                <Button 
                  mode="text" 
                  onPress={() => setActiveView('menu')}
                  disabled={savingLoyalty}
                  style={{ marginTop: 16 }}
                >
                  Back to Menu
                </Button>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* VIEW 5: EVENTS & PROMOTIONS PANEL */}
          {activeView === 'promotions' && (
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
                
                <Card 
                  style={[
                    styles.menuCard, 
                    { 
                      backgroundColor: theme.colors.elevation.level1, 
                      borderColor: theme.dark ? '#333' : '#eee',
                      marginBottom: 16
                    }
                  ]}
                  mode="outlined"
                >
                  <Card.Content style={{ paddingVertical: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconButton icon="bullhorn-variant" size={32} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                      <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginLeft: 8 }}>
                        Live Shop Updates & Flyers
                      </Text>
                    </View>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                      Keep your township customers informed! Post quick tweets about new arrivals, or upload high-impact flyer images showcasing weekly special deals.
                    </Text>
                  </Card.Content>
                </Card>

                {/* Create Promotion Form */}
                <Card 
                  style={{ 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.dark ? '#333' : '#eee',
                    marginBottom: 24
                  }} 
                  mode="outlined"
                >
                  <Card.Content style={{ gap: 16 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                      Post a New Update
                    </Text>

                    <TextInput
                      label="Announcement Content"
                      value={promotionContent}
                      onChangeText={setPromotionContent}
                      style={styles.input}
                      mode="outlined"
                      multiline
                      numberOfLines={4}
                      placeholder="e.g. Fresh batch of township magwinya (fat cakes) just came out of the oil! Come grab yours while they are smoking hot! 🔥"
                    />

                    {/* Optional flyer upload */}
                    <TouchableOpacity onPress={pickPromotionImage} style={{ marginTop: 8 }}>
                      <View style={[
                        styles.bannerUploadPlaceholder, 
                        { 
                          borderColor: theme.colors.primary, 
                          backgroundColor: theme.dark ? '#222' : '#f9f9f9',
                          height: 140,
                          borderRadius: 8,
                          borderStyle: 'dashed',
                          borderWidth: 1.5,
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }
                      ]}>
                        {promotionImage ? (
                          <Image source={{ uri: promotionImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <View style={{ alignItems: 'center' }}>
                            <IconButton icon="image-plus" size={32} iconColor={theme.colors.primary} />
                            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                              Add Flyer / Deal Photo
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                              Optional (Landscape 16:9 recommended)
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {promotionImage && (
                      <Button 
                        mode="outlined" 
                        onPress={() => setPromotionImage(null)} 
                        icon="image-off"
                        textColor={theme.colors.error}
                        style={{ borderColor: theme.colors.error }}
                      >
                        Remove Selected Image
                      </Button>
                    )}

                    <Button 
                      mode="contained" 
                      onPress={handlePostPromotion} 
                      loading={isPostingPromotion}
                      disabled={isPostingPromotion}
                      style={[styles.submitBtn, { marginTop: 8 }]}
                    >
                      Publish to Profile Feed
                    </Button>
                  </Card.Content>
                </Card>

                {/* List of Existing Updates */}
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 12 }}>
                  Your Published Feed ({promotions.length})
                </Text>

                {promotions.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.dark ? '#333' : '#eee', marginBottom: 24 }}>
                    <IconButton icon="message-bulleted-off" size={40} iconColor={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                      You haven't posted any updates or weekly flyers yet. Start by writing one above!
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12, marginBottom: 24 }}>
                    {promotions.map((item: any) => (
                      <Card 
                        key={item.id} 
                        style={{ 
                          backgroundColor: theme.colors.surface, 
                          borderColor: theme.dark ? '#333' : '#eee' 
                        }} 
                        mode="outlined"
                      >
                        <Card.Content>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <IconButton 
                              icon="trash-can-outline" 
                              size={20} 
                              iconColor={theme.colors.error} 
                              style={{ margin: 0, padding: 0 }}
                              onPress={() => handleDeletePromotion(item.id)} 
                            />
                          </View>
                          
                          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginTop: 8, lineHeight: 20 }}>
                            {item.content}
                          </Text>

                          {item.image_url && (
                            <Image 
                              source={{ uri: item.image_url }} 
                              style={{ width: '100%', height: 160, borderRadius: 6, marginTop: 12 }} 
                              resizeMode="cover"
                            />
                          )}
                        </Card.Content>
                      </Card>
                    ))}
                  </View>
                )}

                <Button 
                  mode="text" 
                  onPress={() => setActiveView('menu')}
                  disabled={isPostingPromotion}
                  style={{ marginBottom: 24 }}
                >
                  Back to Menu
                </Button>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* SUB-MODALS */}
          {/* 1. Places Autocomplete Map Modal inside Profile */}
          <Portal>
            <Modal 
              visible={showMap} 
              onDismiss={() => setShowMap(false)} 
              contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
            >
              <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.dark ? '#333' : '#eee', borderBottomWidth: 1 }]}>
                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Pin Your Business</Text>
                <IconButton icon="close" onPress={() => setShowMap(false)} />
              </View>
              
              <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderBottomColor: theme.dark ? '#333' : '#eee', borderBottomWidth: 1 }]}>
                <TextInput
                  placeholder="Search township or street..."
                  value={searchQuery}
                  onChangeText={handleQueryChange}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  onSubmitEditing={handleSearch}
                  textColor={theme.colors.onSurface}
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  right={<TextInput.Icon icon="magnify" color={theme.colors.primary} onPress={handleSearch} />}
                />
              </View>

              {suggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#333' : '#eee' }]}>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {suggestions.map((item, idx) => {
                      const prop = item.properties || {};
                      const parts = [];
                      if (prop.name) parts.push(prop.name);
                      if (prop.street) parts.push(prop.street);
                      if (prop.locality || prop.district) parts.push(prop.locality || prop.district);
                      if (prop.city) parts.push(prop.city);
                      if (prop.country) parts.push(prop.country);
                      const displayName = parts.join(', ');

                      return (
                        <TouchableOpacity
                          key={idx + '-' + (prop.osm_id || Math.random())}
                          style={[styles.suggestionItem, { borderBottomColor: theme.dark ? '#333' : '#f0f0f0' }]}
                          onPress={() => handleSelectSuggestion(item)}
                        >
                          <Text style={[styles.suggestionText, { color: theme.colors.onSurface }]} numberOfLines={2}>
                            {displayName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Mapbox.MapView
                style={styles.map}
                styleURL="mapbox://styles/tatts-io/cmpexgmoc002001sj7ztf2do6"
                onPress={(e) => {
                  if (e?.geometry?.coordinates) {
                    setBizLocation({
                      latitude: e.geometry.coordinates[1],
                      longitude: e.geometry.coordinates[0]
                    });
                  }
                }}
              >
                <Mapbox.Camera
                  zoomLevel={14}
                  centerCoordinate={[bizLocation.longitude, bizLocation.latitude]}
                  animationMode="flyTo"
                  animationDuration={1000}
                />
                <Mapbox.PointAnnotation 
                  id="bizMarker"
                  coordinate={[bizLocation.longitude, bizLocation.latitude]} 
                  draggable 
                  onDragEnd={(e) => {
                    if (e?.geometry?.coordinates) {
                      setBizLocation({
                        latitude: e.geometry.coordinates[1],
                        longitude: e.geometry.coordinates[0]
                      });
                    }
                  }}
                >
                  <View style={{
                    width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: 'white'
                  }} />
                </Mapbox.PointAnnotation>
              </Mapbox.MapView>

              <View style={[styles.modalFooter, { backgroundColor: theme.colors.surface, borderTopColor: theme.dark ? '#333' : '#eee', borderTopWidth: 1 }]}>
                <Text variant="bodySmall" style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>
                  Tip: Drag the pin or search & select a place to set your exact store spot.
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => setShowMap(false)}
                  style={styles.confirmBtn}
                >
                  Confirm Location Pinned
                </Button>
              </View>
            </Modal>
          </Portal>

          {/* 2. Add New Product Modal inside Inventory */}
          <Portal>
            <Modal 
              visible={modalVisible} 
              onDismiss={() => !isSubmitting && setModalVisible(false)}
              contentContainerStyle={[
                styles.modal, 
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.dark ? '#333' : '#eee',
                  borderWidth: theme.dark ? 1 : 0
                }
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Add New Product</Text>
                
                <TouchableOpacity 
                  style={[
                    styles.imagePicker, 
                    { 
                      backgroundColor: theme.dark ? theme.colors.elevation.level1 : '#f5f5f5',
                      borderColor: theme.dark ? '#444' : '#ddd'
                    }
                  ]} 
                  onPress={pickProductImage}
                >
                  {productImage ? (
                    <Image source={{ uri: productImage }} style={styles.pickedImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconButton icon="camera" size={40} iconColor={theme.colors.onSurfaceVariant} />
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>Upload Product Image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TextInput
                  label="Product Name *"
                  value={productName}
                  onChangeText={setProductName}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Price (R) *"
                  value={productPrice}
                  onChangeText={setProductPrice}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />

                <TextInput
                  label="Category *"
                  value={productCategory}
                  onChangeText={setProductCategory}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g. Food, Merch, Electronics"
                />

                <TextInput
                  label="Description"
                  value={productDescription}
                  onChangeText={setProductDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                />

                <View style={styles.toggleRow}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>In Stock</Text>
                  <IconButton 
                    icon={productInStock ? "toggle-switch" : "toggle-switch-off"} 
                    iconColor={productInStock ? theme.colors.primary : "#757575"}
                    size={40}
                    onPress={() => setProductInStock(!productInStock)}
                  />
                </View>

                <Button 
                  mode="contained" 
                  onPress={handleAddProduct} 
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={styles.submitBtn}
                >
                  Post Product
                </Button>
                
                <Button 
                  mode="text" 
                  onPress={() => setModalVisible(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </ScrollView>
            </Modal>
          </Portal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
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
  launcherContainer: {
    flex: 1,
  },
  dashboardBanner: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  dashboardHero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dashboardLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  launcherMenu: {
    padding: 20,
    gap: 20,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  menuCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuCardText: {
    flex: 1,
    marginLeft: 10,
  },
  formScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bannerPicker: {
    width: '100%',
    height: 140,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  pickedBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoAndHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPicker: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  pickedLogo: {
    width: '100%',
    height: '100%',
  },
  bannerUploadPlaceholder: {
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationSection: {
    marginVertical: 20,
  },
  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    borderColor: '#eee',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  price: {
    fontWeight: 'bold',
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 20,
  },
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  imagePicker: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  input: {
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  submitBtn: {
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 8,
  },
  // Map styles
  modalContent: {
    padding: 0,
    margin: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    elevation: 2,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 115,
    left: 16,
    right: 16,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 9999,
    maxHeight: 250,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
  },
  map: {
    flex: 1,
  },
  modalFooter: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    elevation: 10,
  },
  hintText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmBtn: {
    borderRadius: 8,
    paddingVertical: 4,
  }
});
