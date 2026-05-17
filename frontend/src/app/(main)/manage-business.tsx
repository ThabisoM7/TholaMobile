import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Card, TextInput, FAB, Portal, Modal, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { uploadImage } from '../../api/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { mapStyle } from '../../utils/mapStyle';

export default function ManageBusiness() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { action } = useLocalSearchParams();

  // Navigation / Views: 'menu' | 'profile' | 'inventory'
  const [activeView, setActiveView] = useState<'menu' | 'profile' | 'inventory'>('menu');

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
    } catch (error) {
      console.error('Error fetching business/products:', error);
    } finally {
      setLoading(false);
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

  // Rendering Helper Sub-Views
  const renderProductItem = ({ item }: { item: any }) => (
    <Card style={[styles.card, { backgroundColor: theme.dark ? '#1E1E1E' : '#FFF' }]} mode="outlined">
      <View style={styles.cardContent}>
        <Image 
          source={item.image_url ? { uri: item.image_url } : require('../../../assets/icon.png')} 
          style={styles.productImage} 
        />
        <View style={styles.productInfo}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{item.name}</Text>
          <Text variant="bodySmall" style={{ color: theme.dark ? '#AAA' : '#666' }} numberOfLines={2}>{item.description}</Text>
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
        </Text>
      </View>

      {loading ? (
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
              
              <View style={styles.dashboardHero}>
                <Image 
                  source={vendorProfile?.logo_url ? { uri: vendorProfile.logo_url } : require('../../../assets/icon.png')} 
                  style={styles.dashboardLogo} 
                />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {vendorProfile?.business_name}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.dark ? '#AAA' : '#666' }}>
                    {vendorProfile?.category} • {vendorProfile?.township}
                  </Text>
                </View>
              </View>

              <ScrollView contentContainerStyle={styles.launcherMenu}>
                <Card 
                  style={[styles.menuCard, { backgroundColor: theme.dark ? '#1E1E1E' : '#FFF' }]} 
                  onPress={() => setActiveView('profile')}
                  mode="outlined"
                >
                  <Card.Content style={styles.menuCardContent}>
                    <IconButton icon="store-cog" size={40} iconColor={theme.colors.primary} />
                    <View style={styles.menuCardText}>
                      <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                        Edit Business Profile
                      </Text>
                      <Text variant="bodyMedium" style={{ color: theme.dark ? '#AAA' : '#666', marginTop: 4 }}>
                        Change location, description, phone numbers, logo, and cover photo banner.
                      </Text>
                    </View>
                  </Card.Content>
                </Card>

                <Card 
                  style={[styles.menuCard, { backgroundColor: theme.dark ? '#1E1E1E' : '#FFF' }]} 
                  onPress={() => setActiveView('inventory')}
                  mode="outlined"
                >
                  <Card.Content style={styles.menuCardContent}>
                    <IconButton icon="package-variant-closed" size={40} iconColor={theme.colors.primary} />
                    <View style={styles.menuCardText}>
                      <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                        View Inventory / Catalog
                      </Text>
                      <Text variant="bodyMedium" style={{ color: theme.dark ? '#AAA' : '#666', marginTop: 4 }}>
                        Manage product items, prices, descriptions, and toggle stock availability.
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
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
                <TouchableOpacity style={styles.bannerPicker} onPress={pickBannerImage}>
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
                  <TouchableOpacity style={styles.logoPicker} onPress={pickLogoImage}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.pickedLogo} />
                    ) : (
                      <View style={styles.logoPlaceholder}>
                        <IconButton icon="camera" size={30} />
                        <Text style={{ fontSize: 10, textAlign: 'center', color: theme.colors.onSurface }}>Logo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Business Brand</Text>
                    <Text variant="bodySmall" style={{ color: theme.dark ? '#AAA' : '#666' }}>Tap banner or circle to upload your business imagery.</Text>
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
                  <View style={[styles.locationPreview, { backgroundColor: theme.dark ? '#222' : '#F8F9FA' }]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Township Set:</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{bizTownship || "Not set"}</Text>
                      <Text variant="bodySmall" style={{ color: theme.dark ? '#AAA' : '#666', marginTop: 4 }} numberOfLines={1}>
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
              <FlatList
                data={products}
                keyExtractor={(item: any) => item.id}
                renderItem={renderProductItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Your catalog is empty.</Text>
                    <Text variant="bodyMedium" style={{ color: theme.dark ? '#AAA' : '#666' }}>Add products to start selling!</Text>
                  </View>
                }
              />

              <FAB
                icon="plus"
                label="Add Product"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="black"
                onPress={() => setModalVisible(true)}
              />
            </>
          )}

          {/* SUB-MODALS */}
          {/* 1. Places Autocomplete Map Modal inside Profile */}
          <Portal>
            <Modal 
              visible={showMap} 
              onDismiss={() => setShowMap(false)} 
              contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
            >
              <View style={[styles.modalHeader, { backgroundColor: theme.dark ? '#1E1E1E' : '#FFF' }]}>
                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Pin Business Spot</Text>
                <IconButton icon="close" iconColor={theme.colors.onSurface} onPress={() => setShowMap(false)} />
              </View>
              
              <View style={[styles.searchBox, { backgroundColor: theme.dark ? '#1E1E1E' : '#FFF' }]}>
                <TextInput
                  placeholder="Search township or street..."
                  value={searchQuery}
                  onChangeText={handleQueryChange}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  onSubmitEditing={handleSearch}
                  textColor={theme.colors.onSurface}
                  right={<TextInput.Icon icon="magnify" iconColor={theme.colors.primary} onPress={handleSearch} />}
                />
              </View>

              {suggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, { backgroundColor: theme.dark ? '#1E1E1E' : '#FFF', borderColor: theme.dark ? '#333' : '#eee' }]}>
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

              <MapView
                style={styles.map}
                customMapStyle={mapStyle}
                region={{
                  latitude: bizLocation.latitude,
                  longitude: bizLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={(e) => setBizLocation(e.nativeEvent.coordinate)}
              >
                <Marker 
                  coordinate={bizLocation} 
                  draggable 
                  onDragEnd={(e) => setBizLocation(e.nativeEvent.coordinate)}
                  pinColor={theme.colors.primary}
                />
              </MapView>

              <View style={[styles.modalFooter, { backgroundColor: theme.dark ? '#1E1E1E' : '#FFF' }]}>
                <Text variant="bodySmall" style={styles.hintText}>
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
              contentContainerStyle={[styles.modal, { backgroundColor: theme.dark ? '#1E1E1E' : '#FFF' }]}
            >
              <ScrollView>
                <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Add New Product</Text>
                
                <TouchableOpacity style={styles.imagePicker} onPress={pickProductImage}>
                  {productImage ? (
                    <Image source={{ uri: productImage }} style={styles.pickedImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconButton icon="camera" size={40} />
                      <Text style={{ color: theme.colors.onSurface }}>Upload Product Image</Text>
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
