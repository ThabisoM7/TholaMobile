import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ScrollView, Vibration, Animated, Dimensions, Platform, StatusBar } from 'react-native';
import { Text, Card, Button, FAB, Portal, Modal, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../../api/client';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Tactical Scale Physics Tap Wrapper
function TouchableScale({ children, onPress, disabled }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean }) {
  const scaleValue = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 40,
      friction: 3,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 40,
      friction: 3,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

import { TouchableWithoutFeedback } from 'react-native';

export default function LoyaltyScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);

  // Success Celebration Modal
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [rewardUnlocked, setRewardUnlocked] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/loyalty/cards/me');
      setCards(res.data);
    } catch (error) {
      console.error('Error fetching loyalty cards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open Scanner
  const handleOpenScanner = async () => {
    if (!permission) {
      // Loading camera permissions
      return;
    }
    if (!permission.granted) {
      const ask = await requestPermission();
      if (!ask.granted) {
        Alert.alert('Camera Required', 'Thola needs camera permissions to scan loyalty stamp QR codes.');
        return;
      }
    }
    setScanned(false);
    setScannerOpen(true);
  };

  // Handle scanned QR barcode
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processingScan) return;
    setScanned(true);
    setProcessingScan(true);

    try {
      // Trigger satisfying validation vibration
      Vibration.vibrate(100);

      // Parse payload
      const qrPayload = JSON.parse(data);
      if (!qrPayload.vendor_id || !qrPayload.date || !qrPayload.signature) {
        throw new Error('Invalid barcode format.');
      }

      // POST to backend stamp claim
      const res = await apiClient.post('/loyalty/stamp/scan', qrPayload);
      
      // Stop scanner
      setScannerOpen(false);
      
      // Show celebration
      setCelebrationMessage(res.data.message);
      setRewardUnlocked(res.data.rewardUnlocked);
      setCelebrationVisible(true);
      
      // Satisfying double-vibe on successful lock!
      setTimeout(() => Vibration.vibrate([0, 150, 100, 150]), 250);

      // Refresh stamp list
      fetchCards();
    } catch (error: any) {
      console.error('Scan Error:', error);
      Alert.alert(
        'Scan Failed',
        error.response?.data?.error || 'This QR Code signature is invalid, expired, or has a stamp cooldown in place.'
      );
      setScanned(false);
    } finally {
      setProcessingScan(false);
    }
  };

  // Redeem Reward Card at counter
  const handleRedeem = async (cardId: string, vendorName: string, rewardDesc: string) => {
    Alert.alert(
      'Claim Reward',
      `Are you at the counter of ${vendorName} ready to redeem: "${rewardDesc}"? This resets your stamp book back to 0!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem Now',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await apiClient.post(`/loyalty/card/redeem/${cardId}`);
              Alert.alert('Reward Redeemed!', res.data.message);
              Vibration.vibrate(200);
              fetchCards();
            } catch (error: any) {
              Alert.alert('Redeem Failed', error.response?.data?.error || 'Failed to claim reward.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Render individual stamp dots
  const renderStampsGrid = (stampsCount: number, stampsNeeded: number) => {
    const slots = [];
    for (let i = 1; i <= stampsNeeded; i++) {
      const active = i <= stampsCount;
      slots.push(
        <View 
          key={i} 
          style={[
            styles.stampSlot,
            { 
              backgroundColor: active ? '#FFD700' : (theme.dark ? '#1A1A1A' : '#FAFAFA'),
              borderColor: active ? '#FFB300' : (theme.dark ? '#333333' : '#E0E0E0'),
              borderStyle: active ? 'solid' : 'dashed'
            }
          ]}
        >
          {active ? (
            <IconButton icon="star" size={24} iconColor="black" style={{ margin: 0 }} />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.dark ? '#444' : '#CCC' }}>
              {i}
            </Text>
          )}
        </View>
      );
    }
    return <View style={styles.stampsGrid}>{slots}</View>;
  };

  const renderCardItem = ({ item }: { item: any }) => {
    const stampsNeeded = item.vendor.loyaltyProgram?.stamps_needed || 8;
    const rewardDesc = item.vendor.loyaltyProgram?.reward_description || 'Free gift!';
    const isCompleted = item.is_completed;

    return (
      <TouchableScale disabled={!isCompleted} onPress={() => handleRedeem(item.id, item.vendor.business_name, rewardDesc)}>
        <Card 
          style={[
            styles.stampCard, 
            { 
              backgroundColor: theme.colors.surface,
              borderColor: isCompleted ? '#FFB300' : (theme.dark ? '#222' : '#eee'),
              borderWidth: isCompleted ? 2 : 1
            }
          ]}
          mode="outlined"
        >
          <View style={styles.cardHeader}>
            <Image 
              source={item.vendor.logo_url ? { uri: item.vendor.logo_url } : require('../../../assets/icon.png')} 
              style={styles.vendorLogo} 
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.vendor.business_name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.vendor.category} • {item.vendor.township}
              </Text>
            </View>
            {isCompleted && (
              <IconButton icon="gift-outline" iconColor="#FFD700" size={24} style={{ margin: 0 }} />
            )}
          </View>

          <Card.Content style={{ marginTop: 12, paddingHorizontal: 4 }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              🎁 <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Reward:</Text> {rewardDesc}
            </Text>

            {renderStampsGrid(item.stamps_count, stampsNeeded)}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Stamps Collected: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.stamps_count}/{stampsNeeded}</Text>
              </Text>
              
              {isCompleted ? (
                <Button 
                  mode="contained" 
                  buttonColor="#FFD700" 
                  textColor="black"
                  style={{ borderRadius: 8 }}
                  onPress={() => handleRedeem(item.id, item.vendor.business_name, rewardDesc)}
                >
                  Claim Reward!
                </Button>
              ) : (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                  Keep scanning to unlock!
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableScale>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {scannerOpen ? (
        <View style={StyleSheet.absoluteFillObject}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
          
          {/* Custom High-Contrast Overlay Mask */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scanTargetBox} />
            <Text style={styles.scanInstructions}>
              Center the vendor's Loyalty QR Code inside the square.
            </Text>
            {processingScan && (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />
            )}
            <Button 
              mode="contained" 
              buttonColor="rgba(255,255,255,0.2)"
              textColor="white"
              style={{ marginTop: 32 }}
              onPress={() => setScannerOpen(false)}
            >
              Cancel
            </Button>
          </View>
        </View>
      ) : (
        <>
          {/* HEADER */}
          <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
            <IconButton 
              icon="arrow-left" 
              iconColor="black"
              onPress={() => router.replace('/(main)')} 
            />
            <Text variant="headlineSmall" style={[styles.headerTitle, { color: 'black' }]}>
              My Stamp Cards
            </Text>
            <IconButton icon="refresh" iconColor="black" onPress={fetchCards} />
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={cards}
              keyExtractor={(item) => item.id}
              renderItem={renderCardItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <IconButton icon="ticket-confirmation-outline" size={64} iconColor={theme.colors.onSurfaceDisabled} />
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface, textAlign: 'center', marginTop: 8 }}>
                    No Stamp Cards Yet!
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, marginHorizontal: 32 }}>
                    Buy from registered local vendors and scan their QR stamp code to claim your first reward!
                  </Text>
                </View>
              }
            />
          )}

          {/* FLOATING ACTION SCAN BUTTON */}
          <FAB
            icon="qrcode-scan"
            label="Scan Stamp QR"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color="black"
            onPress={handleOpenScanner}
          />
        </>
      )}

      {/* CELEBRATION MODAL */}
      <Portal>
        <Modal
          visible={celebrationVisible}
          onDismiss={() => setCelebrationVisible(false)}
          contentContainerStyle={[styles.celebrationContent, { backgroundColor: theme.colors.surface }]}
        >
          <IconButton 
            icon={rewardUnlocked ? "gift" : "star-circle"} 
            size={64} 
            iconColor={rewardUnlocked ? "#FFD700" : theme.colors.primary} 
          />
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface, textAlign: 'center', marginHorizontal: 16 }}>
            {rewardUnlocked ? "Loyalty Reward Unlocked! 🎁" : "Stamp Claimed successfully! ⭐"}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 12, marginHorizontal: 16 }}>
            {celebrationMessage}
          </Text>
          <Button 
            mode="contained" 
            style={{ marginTop: 24, paddingHorizontal: 24 }}
            onPress={() => setCelebrationVisible(false)}
          >
            Awe, Got it!
          </Button>
        </Modal>
      </Portal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 88,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  stampCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  vendorLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  stampsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginVertical: 4,
  },
  stampSlot: {
    width: (width - 76) / 5,
    height: (width - 76) / 5,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 100,
    borderRadius: 16,
    elevation: 6,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTargetBox: {
    width: 250,
    height: 250,
    borderWidth: 4,
    borderColor: '#FFD700',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
    marginHorizontal: 32,
    fontWeight: 'bold',
  },
  celebrationContent: {
    margin: 24,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
});
