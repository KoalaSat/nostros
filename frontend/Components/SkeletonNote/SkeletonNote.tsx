import * as React from 'react'
import {StyleSheet, View} from 'react-native'
import {Card, useTheme, IconButton} from 'react-native-paper'
import ContentLoader, {Rect, Circle} from "react-content-loader/native"
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

export const SkeletonNote: React.FC = () => {
    const theme = useTheme()
    const skeletonBackgroundColor = theme.colors.elevation.level2
    const skeletonForegroundColor = theme.colors.elevation.level5

    return (
        <Card style={[styles.container, {backgroundColor: theme.colors.elevation.level1}]}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <ContentLoader
                        speed={2}
                        width={285}
                        height={54}
                        viewBox="0 0 285 54"
                        backgroundColor={skeletonBackgroundColor}
                        foregroundColor={skeletonForegroundColor}
                    >
                        <Circle cx="27" cy="27" r="27"/>
                        <Rect x="70" y="0" rx="10" ry="10" width="170" height="12"/>
                        <Rect x="70" y="21" rx="10" ry="10" width="120" height="12"/>
                        <Rect x="70" y="42" rx="7" ry="7" width="70" height="12"/>
                    </ContentLoader>
                </View>
                <IconButton
                    icon='dots-vertical'
                    iconColor={theme.colors.elevation.level3}
                    size={25}
                />
            </View>
            <View style={[styles.content, {borderColor: theme.colors.onSecondary}]}>
                <ContentLoader
                    speed={2}
                    width={328}
                    height={32}
                    viewBox="0 0 328 32"
                    backgroundColor={skeletonBackgroundColor}
                    foregroundColor={skeletonForegroundColor}
                >
                    <Rect x="0" y="0" rx="6" ry="6" width="100%" height="12"/>
                    <Rect x="0" y="20" rx="6" ry="6" width="60%" height="12"/>
                </ContentLoader>
            </View>
            <View style={styles.footer}>
                <View style={styles.action}>
                    <MaterialCommunityIcons
                        style={styles.actionIcon}
                        name='message-outline'
                        size={25}
                        color={theme.colors.elevation.level3}
                    />
                    <ContentLoader
                        animate={false}
                        width={24}
                        height={16}
                        viewBox="0 0 24 16"
                        backgroundColor={skeletonBackgroundColor}
                        foregroundColor={skeletonForegroundColor}
                    >
                        <Rect x="0" y="0" rx="6" ry="6" width="100%" height="16"/>
                    </ContentLoader>
                </View>
                <View style={styles.action}>
                    <MaterialCommunityIcons
                        style={styles.actionIcon}
                        name='cached'
                        size={25}
                        color={theme.colors.elevation.level3}
                    />
                    <ContentLoader
                        animate={false}
                        width={24}
                        height={16}
                        viewBox="0 0 24 16"
                        backgroundColor={skeletonBackgroundColor}
                        foregroundColor={skeletonForegroundColor}
                    >
                        <Rect x="0" y="0" rx="6" ry="6" width="100%" height="16"/>
                    </ContentLoader>
                </View>
                <View style={styles.action}>
                    <MaterialCommunityIcons
                        style={styles.actionIcon}
                        name={'thumb-down-outline'}
                        size={25}
                        color={theme.colors.elevation.level3}
                    />
                    <ContentLoader
                        animate={false}
                        width={24}
                        height={16}
                        viewBox="0 0 24 16"
                        backgroundColor={skeletonBackgroundColor}
                        foregroundColor={skeletonForegroundColor}
                    >
                        <Rect x="0" y="0" rx="6" ry="6" width="100%" height="16"/>
                    </ContentLoader>
                </View>
                <View style={styles.action}>
                    <MaterialCommunityIcons
                        style={styles.actionIcon}
                        name={'thumb-up-outline'}
                        size={25}
                        color={theme.colors.elevation.level3}
                    />
                    <ContentLoader
                        animate={false}
                        width={24}
                        height={16}
                        viewBox="0 0 24 16"
                        backgroundColor={skeletonBackgroundColor}
                        foregroundColor={skeletonForegroundColor}
                    >
                        <Rect x="0" y="0" rx="6" ry="6" width="100%" height="16"/>
                    </ContentLoader>
                </View>
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    container: {},
    header: {
        flexDirection: 'row',
        padding: 16,
    },
    headerContent: {
        flex: 1,
    },
    content: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        padding: 16
    },
    footer: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        marginRight: 8,
    }
})