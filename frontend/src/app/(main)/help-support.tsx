import React from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, useTheme, List, Divider } from 'react-native-paper';

export default function HelpSupportScreen() {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={styles.title}>Help & Support</Text>
      
      <Text variant="bodyLarge" style={styles.subtitle}>
        We're here to help! If you have any issues or questions about using THOLA, please reach out.
      </Text>

      <List.Section>
        <List.Subheader>Contact Us</List.Subheader>
        <List.Item
          title="Email Support"
          description="support@thola.app"
          left={(props) => <List.Icon {...props} icon="email" />}
          onPress={() => Linking.openURL('mailto:support@thola.app')}
        />
        <Divider />
        <List.Item
          title="WhatsApp Support"
          description="+27 82 123 4567"
          left={(props) => <List.Icon {...props} icon="whatsapp" />}
          onPress={() => {}}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Frequently Asked Questions</List.Subheader>
        <List.Accordion
          title="How do I verify my business?"
          left={props => <List.Icon {...props} icon="check-decagram" />}>
          <List.Item titleNumberOfLines={4} title="Go to the dashboard and submit your ID and a selfie. Approval takes up to 24 hours." />
        </List.Accordion>
        <List.Accordion
          title="How are payments handled?"
          left={props => <List.Icon {...props} icon="cash" />}>
          <List.Item titleNumberOfLines={4} title="Currently, payments are handled directly between the buyer and the vendor (cash or EFT upon delivery/pickup)." />
        </List.Accordion>
        <List.Accordion
          title="Can I change my email address?"
          left={props => <List.Icon {...props} icon="email-edit" />}>
          <List.Item titleNumberOfLines={4} title="For security reasons, email changes are not supported right now. Please contact support if you lose access to your email." />
        </List.Accordion>
      </List.Section>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  subtitle: {
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 20,
  }
});
