import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  EmptyState,
  Loading,
  Note,
  Page,
  SearchBar,
  StatusBadge,
} from '../components/UI';
import { api } from '../services/api';
import { Assessment } from '../types/api';
import { color, typography, spacing, radius } from '../constants/theme';

export default function History() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'draft'>('all');

  const assessmentsQuery = useQuery<Assessment[]>({
    queryKey: ['assessments'],
    queryFn: async () => (await api.get('/assessments')).data,
  });

  const allItems = assessmentsQuery.data || [];

  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      String(item.id).includes(search.trim()) ||
      item.modality.toLowerCase().includes(search.toLowerCase().trim()) ||
      (item.clinical_metadata?.anatomical_location &&
        String(item.clinical_metadata.anatomical_location)
          .toLowerCase()
          .includes(search.toLowerCase().trim()));

    if (!matchesSearch) return false;

    if (filter === 'completed') return item.status === 'completed';
    if (filter === 'draft') return item.status !== 'completed';
    return true;
  });

  return (
    <Page
      title="Screening History"
      subtitle="Complete Registry of Saved Case Records"
      badge="Archival Registry"
      showBack
      onBack={() => router.replace('/home')}
    >
      {/* Search Input Bar */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by ID, modality, or body site..."
        onClear={() => setSearch('')}
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'completed', 'draft'] as const).map((tab) => {
          const isSelected = filter === tab;
          const count =
            tab === 'all'
              ? allItems.length
              : tab === 'completed'
              ? allItems.filter((a) => a.status === 'completed').length
              : allItems.filter((a) => a.status !== 'completed').length;

          return (
            <Pressable
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.filterTab, isSelected && styles.filterTabSelected]}
            >
              <Text style={[styles.filterTabText, isSelected && styles.filterTabTextSelected]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Assessment Items List */}
      {assessmentsQuery.isPending ? (
        <Loading label="Fetching assessment archives..." />
      ) : assessmentsQuery.isError ? (
        <Note danger>Could not load screening history. Check your network or server status.</Note>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={search ? 'No Matching Cases' : 'No Assessments Recorded'}
          message={
            search
              ? `No assessments matched "${search}". Try searching by ID or clear the search filter.`
              : 'You have not conducted any lesion screenings yet.'
          }
          actionTitle={search ? 'Clear Search' : 'Start First Screening'}
          onAction={search ? () => setSearch('') : () => router.push('/assessment/new')}
        />
      ) : (
        filteredItems.map((item) => (
          <Card
            key={item.id}
            style={styles.itemCard}
            onPress={() =>
              router.push({
                pathname: '/assessment/details',
                params: { id: String(item.id) },
              })
            }
          >
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.caseTitle}>Screening #{item.id}</Text>
                <Text style={styles.caseDate}>
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · {item.modality === 'dermoscopic' ? 'Dermoscopy' : item.modality}
                </Text>
              </View>
              <StatusBadge status={item.status === 'completed' ? 'Completed' : 'Draft'} />
            </View>

            {item.prediction ? (
              <View style={styles.predictionHighlight}>
                <View>
                  <Text style={styles.probLabel}>Ensemble Malignancy</Text>
                  <Text style={styles.probValue}>
                    {(item.prediction.ensemble_probability * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.viewBadge}>
                  <Text style={styles.viewBadgeText}>View Report ›</Text>
                </View>
              </View>
            ) : (
              <View style={styles.draftRow}>
                <Text style={styles.draftNote}>Saved as draft · Image pending or inference not run</Text>
                <Text style={styles.viewBadgeText}>Review ›</Text>
              </View>
            )}
          </Card>
        ))
      )}

      <Button
        title="Start New Screening Assessment"
        onPress={() => router.push('/assessment/new')}
        style={{ marginTop: spacing.md }}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  filterTabSelected: {
    backgroundColor: color.primaryLight,
    borderColor: color.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: color.textMuted,
  },
  filterTabTextSelected: {
    color: color.primaryDark,
    fontWeight: '700',
  },
  itemCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  caseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
  },
  caseDate: {
    fontSize: 12,
    color: color.textMuted,
    marginTop: 2,
  },
  predictionHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: color.primary,
    marginTop: 4,
  },
  probLabel: {
    fontSize: 11,
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  probValue: {
    fontSize: 18,
    fontWeight: '800',
    color: color.text,
  },
  viewBadge: {
    paddingVertical: 4,
  },
  viewBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.primary,
  },
  draftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  draftNote: {
    fontSize: 12,
    color: color.textMuted,
  },
});
