import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SKILL_PHOTOS } from '@/lib/rideBetterSkillPhotos';
import type { SkillCategoryId } from '@/lib/rideBetterSkills';

type SkillHeroPhotoProps = {
  categoryId: SkillCategoryId;
  onOpenResource: (url: string) => void;
};

function SkillHeroPhoto({ categoryId, onOpenResource }: SkillHeroPhotoProps) {
  const photo = SKILL_PHOTOS[categoryId];
  const licenseUrl = photo.licenseUrl;

  return (
    <View>
      <Image
        source={photo.image}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel={photo.description}
      />
      <Pressable
        accessibilityRole="link"
        onPress={() => onOpenResource(photo.sourceUrl)}
        style={styles.attribution}
      >
        <Text style={styles.attributionText}>
          Photo: {photo.creator} — {photo.title}
        </Text>
      </Pressable>
      {licenseUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => onOpenResource(licenseUrl)}
          style={styles.license}
        >
          <Text style={styles.licenseText}>
            {photo.licenseName} · shown uncropped
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.licenseText}>Public domain · shown uncropped</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 230,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#405C65',
    backgroundColor: '#14262D',
  },
  attribution: {
    alignSelf: 'flex-start',
    marginTop: 7,
  },
  attributionText: {
    color: '#C2D0CE',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  license: {
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  licenseText: {
    color: '#93A7A5',
    fontSize: 10,
  },
});

export default SkillHeroPhoto;
