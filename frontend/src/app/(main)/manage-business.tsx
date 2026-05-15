import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Text, Button, Card, TextInput, FAB, Portal, Modal, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { uploadImage } from '../../api/supabase';
import { useLocalSearchParams, router } from 'expo-router';

export default function ManageBusiness() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { action } = useLocalSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [inStock, setInStock] = useState(true);

  useEffect(() => {
    fetchProducts();
    if (action === 'add') {
      setModalVisible(true);
    }
  }, [action]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // We need the vendor ID. In a real app, this would be in the user store or fetched.
      // Fetching vendor profile first
      const vendorRes = await apiClient.get('/vendors/me'); // Assuming an endpoint exists or we can find it
      const productsRes = await apiClient.get(`/products/vendor/${vendorRes.data.id}`);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleAddProduct = async () => {
    if (!name || !price || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      let imageUrl = '';
      if (image) {
        const uploadedUrl = await uploadImage(image, 'products');
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      await apiClient.post('/products', {
        name,
        description,
        price: parseFloat(price),
        category,
        image_url: imageUrl || null,
        in_stock: inStock,
      });

      Alert.alert('Success', 'Product added successfully');
      setModalVisible(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setDescription('');
    setCategory('');
    setImage(null);
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardContent}>
        <Image 
          source={item.image_url ? { uri: item.image_url } : require('../../../assets/icon.png')} 
          style={styles.productImage} 
        />
        <View style={styles.productInfo}>
          <Text variant="titleMedium">{item.name}</Text>
          <Text variant="bodySmall" numberOfLines={2}>{item.description}</Text>
          <View style={styles.priceRow}>
            <Text variant="labelLarge" style={styles.price}>R {item.price}</Text>
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

  const toggleStock = async (id: string, inStock: boolean) => {
    try {
      await apiClient.put(`/products/${id}`, { in_stock: inStock });
      fetchProducts();
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
              fetchProducts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.headerTitle}>Manage Business</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge">Your catalog is empty.</Text>
              <Text variant="bodyMedium" style={{ color: '#666' }}>Add products to start selling!</Text>
            </View>
          }
        />
      )}

      <Portal>
        <Modal 
          visible={modalVisible} 
          onDismiss={() => !isSubmitting && setModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>Add New Product</Text>
            
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <IconButton icon="camera" size={40} />
                  <Text>Upload Product Image</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              label="Product Name *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Price (R) *"
              value={price}
              onChangeText={setPrice}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              label="Category *"
              value={category}
              onChangeText={setCategory}
              mode="outlined"
              style={styles.input}
              placeholder="e.g. Groceries, Services, Food"
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.toggleRow}>
              <Text variant="bodyLarge">In Stock</Text>
              <IconButton 
                icon={inStock ? "toggle-switch" : "toggle-switch-off"} 
                iconColor={inStock ? theme.colors.primary : "#757575"}
                size={40}
                onPress={() => setInStock(!inStock)}
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

      <FAB
        icon="plus"
        label="Add Product"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="black"
        onPress={() => setModalVisible(true)}
      />
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
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
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
  submitBtn: {
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 8,
  },
});


