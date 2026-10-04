/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export const crudResourceCatalog = [
  {
    "access": {
      "capability": "system.notice",
      "owner_field": "created_by",
      "permissions": {
        "create": "system:notice:add",
        "delete": "system:notice:remove",
        "list": "system:notice:list",
        "read": "system:notice:list",
        "update": "system:notice:edit"
      }
    },
    "api": {
      "operations": {
        "create": "post_system_notices",
        "delete": "delete_system_notices_by_id",
        "list": "get_system_notices",
        "read": "get_system_notices_by_id",
        "update": "put_system_notices_by_id"
      },
      "path": "/api/v1/system/notices"
    },
    "extension_permissions": {},
    "fields": [
      {
        "enum_values": {},
        "labels": {
          "en": "Notice ID",
          "zh_cn": "公告编号"
        },
        "name": "id",
        "nullable": false,
        "order": 10,
        "usage": {
          "create": false,
          "create_optional": false,
          "filter": false,
          "list": true,
          "read": true,
          "sort": false,
          "update": false,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": false
        },
        "value_type": "i64",
        "widget": "hidden",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Notice title",
          "zh_cn": "公告标题"
        },
        "name": "title",
        "nullable": false,
        "order": 30,
        "usage": {
          "create": true,
          "create_optional": false,
          "filter": true,
          "list": true,
          "read": true,
          "sort": false,
          "update": true,
          "update_optional": false
        },
        "validation": {
          "max_length": 200,
          "maximum": null,
          "min_length": 1,
          "minimum": null,
          "required": true
        },
        "value_type": "string",
        "widget": "text",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Notice content",
          "zh_cn": "公告内容"
        },
        "name": "content_markdown",
        "nullable": false,
        "order": 40,
        "usage": {
          "create": true,
          "create_optional": false,
          "filter": false,
          "list": true,
          "read": true,
          "sort": false,
          "update": true,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "max_utf8_bytes": 60000,
          "maximum": null,
          "min_length": null,
          "min_utf8_bytes": 1,
          "minimum": null,
          "required": true
        },
        "value_type": "string",
        "widget": "text",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Notice type",
          "zh_cn": "公告类型"
        },
        "name": "notice_type",
        "nullable": true,
        "order": 50,
        "usage": {
          "create": true,
          "create_optional": false,
          "filter": true,
          "filter_exact": true,
          "list": true,
          "read": true,
          "sort": false,
          "update": true,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": false
        },
        "value_type": "string",
        "widget": "text",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Notice status",
          "zh_cn": "公告状态"
        },
        "name": "status",
        "nullable": false,
        "order": 60,
        "usage": {
          "create": false,
          "create_optional": false,
          "filter": true,
          "filter_exact": true,
          "list": true,
          "read": true,
          "sort": false,
          "update": true,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": false
        },
        "value_type": "string",
        "widget": "text",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Created by",
          "zh_cn": "创建人"
        },
        "name": "created_by",
        "nullable": true,
        "order": 70,
        "usage": {
          "create": false,
          "create_optional": false,
          "filter": false,
          "list": true,
          "read": true,
          "sort": false,
          "update": false,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": false
        },
        "value_type": "i64",
        "widget": "hidden",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Created at",
          "zh_cn": "创建时间"
        },
        "name": "created_at",
        "nullable": false,
        "order": 90,
        "usage": {
          "create": false,
          "create_optional": false,
          "filter": false,
          "list": true,
          "read": true,
          "sort": true,
          "sort_desc": true,
          "update": false,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": false
        },
        "value_type": "date_time",
        "widget": "date_time",
        "wire_type": "date_time"
      }
    ],
    "labels": {
      "en": "Notice",
      "zh_cn": "通知公告"
    },
    "menu": {
      "icon": null,
      "key": "system.notice",
      "labels": {
        "en": "Notices",
        "zh_cn": "通知公告"
      },
      "order": 15,
      "parent": "system"
    },
    "module": "system",
    "name": "notice",
    "profile": "flat_crud",
    "route": {
      "key": "system.notice",
      "path": "/system/notice"
    },
    "storage": "control_row"
  },
  {
    "access": {
      "capability": "system.post",
      "permissions": {
        "create": "system:post:add",
        "delete": "system:post:remove",
        "list": "system:post:list",
        "read": "system:post:list",
        "update": "system:post:edit"
      }
    },
    "api": {
      "operations": {
        "create": "post_system_posts",
        "delete": "delete_system_posts_by_id",
        "list": "get_system_posts",
        "read": "get_system_posts_by_id",
        "update": "put_system_posts_by_id"
      },
      "path": "/api/v1/system/posts"
    },
    "extension_permissions": {
      "export": "system:post:export"
    },
    "fields": [
      {
        "enum_values": {},
        "labels": {
          "en": "Post ID",
          "zh_cn": "岗位编号"
        },
        "name": "id",
        "nullable": false,
        "order": 10,
        "usage": {
          "create": false,
          "create_optional": false,
          "filter": false,
          "list": true,
          "read": true,
          "sort": false,
          "update": false,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": false
        },
        "value_type": "i64",
        "widget": "hidden",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Post name",
          "zh_cn": "岗位名称"
        },
        "name": "name",
        "nullable": false,
        "order": 30,
        "usage": {
          "create": true,
          "create_optional": false,
          "filter": true,
          "list": true,
          "read": true,
          "sort": false,
          "update": true,
          "update_optional": false
        },
        "validation": {
          "max_length": 64,
          "maximum": null,
          "min_length": 1,
          "minimum": null,
          "required": true
        },
        "value_type": "string",
        "widget": "text",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Post code",
          "zh_cn": "岗位编码"
        },
        "name": "code",
        "nullable": false,
        "order": 40,
        "usage": {
          "create": true,
          "create_optional": false,
          "filter": true,
          "list": true,
          "read": true,
          "sort": false,
          "update": false,
          "update_optional": false
        },
        "validation": {
          "max_length": 64,
          "maximum": null,
          "min_length": 1,
          "minimum": null,
          "required": true
        },
        "value_type": "string",
        "widget": "text",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Display order",
          "zh_cn": "显示顺序"
        },
        "name": "sort",
        "nullable": false,
        "order": 50,
        "usage": {
          "create": true,
          "create_optional": true,
          "filter": false,
          "list": true,
          "read": true,
          "sort": true,
          "update": true,
          "update_optional": true
        },
        "validation": {
          "max_length": null,
          "maximum": 999,
          "min_length": null,
          "minimum": 0,
          "required": false
        },
        "value_type": "i32",
        "widget": "number",
        "wire_type": "i32"
      },
      {
        "enum_values": {
          "0": {
            "en": "Disabled",
            "zh_cn": "停用"
          },
          "1": {
            "en": "Active",
            "zh_cn": "正常"
          }
        },
        "labels": {
          "en": "Status",
          "zh_cn": "状态"
        },
        "name": "status",
        "nullable": false,
        "order": 60,
        "usage": {
          "create": false,
          "create_optional": false,
          "filter": true,
          "list": true,
          "read": true,
          "sort": false,
          "update": true,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": true
        },
        "value_type": "string",
        "widget": "select",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Remark",
          "zh_cn": "备注"
        },
        "name": "remark",
        "nullable": true,
        "order": 70,
        "usage": {
          "create": false,
          "create_optional": false,
          "filter": false,
          "list": false,
          "read": true,
          "sort": false,
          "update": false,
          "update_optional": false
        },
        "validation": {
          "max_length": 512,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": false
        },
        "value_type": "string",
        "widget": "textarea",
        "wire_type": "string"
      },
      {
        "enum_values": {},
        "labels": {
          "en": "Created at",
          "zh_cn": "创建时间"
        },
        "name": "created_at",
        "nullable": false,
        "order": 90,
        "usage": {
          "create": false,
          "create_optional": false,
          "filter": false,
          "list": true,
          "read": true,
          "sort": false,
          "update": false,
          "update_optional": false
        },
        "validation": {
          "max_length": null,
          "maximum": null,
          "min_length": null,
          "minimum": null,
          "required": false
        },
        "value_type": "date_time",
        "widget": "date_time",
        "wire_type": "date_time"
      }
    ],
    "labels": {
      "en": "Post",
      "zh_cn": "岗位"
    },
    "menu": {
      "icon": null,
      "key": "system.post",
      "labels": {
        "en": "Posts",
        "zh_cn": "岗位管理"
      },
      "order": 8,
      "parent": "system"
    },
    "module": "system",
    "name": "post",
    "profile": "flat_crud",
    "route": {
      "key": "system.post",
      "path": "/system/post"
    },
    "storage": "control_row"
  }
] as const

export type CrudResourceDescriptor = typeof crudResourceCatalog[number]
export type CrudResourceName = CrudResourceDescriptor['name']

export const crudResourceCatalogByName = {
  "notice": crudResourceCatalog[0],
  "post": crudResourceCatalog[1],
} as const satisfies Readonly<Record<CrudResourceName, CrudResourceDescriptor>>

export type CrudResourceDescriptorByName<Name extends CrudResourceName> =
  typeof crudResourceCatalogByName[Name]

export function findCrudResource<Name extends CrudResourceName>(
  name: Name,
): CrudResourceDescriptorByName<Name> {
  return crudResourceCatalogByName[name]
}
